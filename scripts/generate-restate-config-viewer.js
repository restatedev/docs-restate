#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const $RefParser = require("@apidevtools/json-schema-ref-parser");

const schemaPath = "docs/schemas/restate-server-configuration-schema.json";
const outputPath = "docs/references/server-config.mdx";

async function parseJsonSchema(schemaPath) {
    try {
        return  await $RefParser.dereference(schemaPath, {
            mutateInputSchema: false,
            continueOnError: false,
            dereference: {
                circular: "ignore"
            }
        });
    } catch (error) {
        console.error('Error parsing JSON schema:', error);
        throw error;
    }
}

function formatDescription(description, title, examples) {
    const titleStr = title ? `${title}: ` : '';
    
    if (!description) {
        // Return title if present, even without description
        return titleStr;
    }

    // Split by backtick-delimited code blocks, keeping the delimiters
    const parts = description.split(/(`[^`]+`)/g);
    
    const cleanDescription = parts.map(part => {
        if (part.startsWith('`') && part.endsWith('`')) {
            // Code block - escape < and > inside
            const inner = part.slice(1, -1);
            return '`' + inner.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '`';
        } else {
            // Regular text - escape ALL < and > characters
            return part.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }).join('')
        // Convert markdown links to proper format
        .replace(/\[(.*?)\]\((.*?)\)/g, '[$1]($2)')
        // Escape quotes for JSX attributes
        .replace(/"/g, '\\"');

    const exampleStr = examples && Array.isArray(examples) && examples.length > 0
        ? '\n\nExamples:\n' + examples.map(ex => `${JSON.stringify(ex, null, 2)}`).join(' or ')
        : '';
    if (title && description.includes(title)) {
        return `${cleanDescription}${exampleStr}`;
    }
    return `${titleStr}${cleanDescription}${exampleStr}`;
}

function getTypeFromSchema(propSchema) {
    if (propSchema.type) {
        if (Array.isArray(propSchema.type)) {
            // Handle union types like ["string", "null"]
            const isOptional = propSchema.type.includes('null');
            return {
                type: propSchema.type.join(' | '),
                optional: isOptional
            };
        }
        return { type: propSchema.type, optional: false };
    }
    
    if (propSchema.oneOf) {
        return { type: 'oneOf', optional: false };
    }
    
    if (propSchema.anyOf) {
        return { type: 'anyOf', optional: false };
    }
    
    if (propSchema.$ref) {
        const refName = propSchema.$ref.split('/').pop();
        return { type: refName, optional: false };
    }
    
    return { type: 'unknown', optional: false };
}

// Extracts the default value as a display string, or null when the field has
// no renderable default (unset, or a non-array object default we don't show).
function getDefaultValue(propSchema, type) {
    const value = propSchema.default;
    if (value === undefined) return null;
    else if (value === null) return "null";
    else if (typeof value === 'string') return value;
    // needs to be checked before 'object' because typeof array is 'object'
    else if (type === 'array') return JSON.stringify(value);
    else if (typeof value === 'object') return null;
    else return String(value);
}

// Builds the `default="..."` attribute (with a leading space) for a field, or
// an empty string when there is no renderable default. Inner double quotes are
// escaped as HTML entities so they don't terminate the JSX attribute.
function getDefaultAttr(propSchema, type) {
    const value = getDefaultValue(propSchema, type);
    return value === null ? "" : ` default="${value.replace(/"/g, '&quot;')}"`;
}

// Whether an array holds tables rather than scalars. Arrays of tables are
// written as `[[key]]` in TOML and cannot be set from a single env var.
function itemsAreObjects(propSchema) {
    const items = propSchema.items;
    if (!items) return false;
    return Boolean(items.properties) || items.type === 'object';
}

// Determines whether a field is a settable leaf value (as opposed to a
// grouping object/array or a oneOf/anyOf container whose variants are objects).
// Only leaves map to a single environment variable.
function isLeafField(propSchema, type) {
    // A whole array or map is settable from one env var, because figment parses
    // `[a, b]` into a list and `{k=v}` into a dict. Individual elements are not.
    if (type === 'array') return !itemsAreObjects(propSchema);
    if (type === 'object') return !propSchema.properties && Boolean(propSchema.additionalProperties);
    if (type === 'oneOf') return !(propSchema.oneOf || []).some(v => v.properties);
    if (type === 'anyOf') return !(propSchema.anyOf || []).some(v => v.properties);
    return true;
}

// Whether a field is written as a TOML table header (`[section]`) rather than
// as a `key = value` line.
function isTomlTable(propSchema, type) {
    if (type === 'object') return true;
    if (type === 'oneOf' || type === 'anyOf') {
        return (propSchema.oneOf || propSchema.anyOf || []).some(v => v.properties);
    }
    return false;
}

// Builds the environment variable name for a config option from its path.
// Restate strips the `RESTATE_` prefix, splits nesting levels on `__` and turns
// every remaining `_` back into a `-`, which is the inverse of what we do here
// (see `crates/types/src/config_loader.rs` in restatedev/restate). Elements of
// an array are not addressable, since there is no index syntax.
function buildEnvVar(path) {
    if (!path || path.length === 0) return null;
    if (path.includes('[]')) return null;
    return 'RESTATE_' + path.map(s => s.replace(/-/g, '_').toUpperCase()).join('__');
}

// Builds the TOML key for a config option from its path. A dotted key is valid
// TOML on its own line, so the rendered value is directly pasteable. Tables are
// shown with their header syntax (`[worker.invoker]`, or `[[ingress.kafka-clusters]]`
// for an array of tables). Options nested inside an array of tables are given
// relative to that header, since the index is not expressible as a dotted key.
function buildTomlPath(path, propSchema, type) {
    if (!path || path.length === 0) return null;
    // The synthetic `item` node of an array restates the array's own key.
    if (path[path.length - 1] === '[]') return null;

    const lastArray = path.lastIndexOf('[]');
    const dotted = (lastArray === -1 ? path : path.slice(lastArray + 1)).join('.');

    if (type === 'array') {
        return itemsAreObjects(propSchema) ? `[[${dotted}]]` : dotted;
    }
    return isTomlTable(propSchema, type) ? `[${dotted}]` : dotted;
}

function generatePostAttr(propSchema, tomlPath, envVar) {
    let postTags = []
    if (propSchema.format) {
        postTags.push(`\'format: ${propSchema.format}\'`);
    }
    if (propSchema.enum) {
        postTags.push(`\'enum: ${propSchema.enum.map(v => (typeof v === 'string' ? `"${v}"` : v)).join(', ')}\'`);
    }
    if (propSchema.minimum) {
        postTags.push(`\'minimum: ${propSchema.minimum}\'`);
    }
    if (propSchema.maximum) {
        postTags.push(`\'maximum: ${propSchema.maximum}\'`);
    }
    if (propSchema.minLength) {
        postTags.push(`\'minLength: ${propSchema.minLength}\'`);
    }
    if (propSchema.maxLength) {
        postTags.push(`\'maxLength: ${propSchema.maxLength}\'`);
    }
    if (tomlPath) {
        postTags.push(`\'toml: ${tomlPath}\'`);
    }
    if (envVar) {
        postTags.push(`\'env: ${envVar}\'`);
    }

    return ` post={[${postTags.join(",")}]}`;
}

function parseVariantName(variant, index) {
    if (variant.enum && variant.enum.length === 1) {
        let variantValue = variant.enum[0];
        if (typeof variantValue === 'string') {
            return `"${variantValue}"`;
        } else if (typeof variantValue === 'object') {
            return JSON.stringify(variantValue);
        } else {
            return `${String(variantValue)}`;
        }
    } else if (variant.title) {
        return `Option ${index + 1}: ${variant.title}`;
    } else if (variant.const !== undefined) {
        return `"${variant.const}"`;
    } else if (variant.description) {
        return `Option ${index + 1}: ${variant.description}`;
    } else {
        return `Option ${index + 1}`;
    }
}

function generateResponseFieldsFromProperties(properties, requiredProps = [], level = 0, path = []) {
    let generatedOutput = '';
    Object.entries(properties).forEach(([subPropName, subPropSchema]) => {
        generatedOutput += generateResponseField(
            subPropName,
            subPropSchema,
            requiredProps.includes(subPropName),
            level + 2,
            [...path, subPropName]
        );
    });
    return generatedOutput
}

function generateResponseField(propName, propSchema, isRequired = false, level = 0, path = []) {
    const indent = '    '.repeat(level);
    const { type, optional } = getTypeFromSchema(propSchema);
    const required = isRequired && !optional ? ' required' : '';
    let description = formatDescription(propSchema.description, propSchema.title, propSchema.examples);

    const envVar = isLeafField(propSchema, type) ? buildEnvVar(path) : null;
    const tomlPath = buildTomlPath(path, propSchema, type);
    let postAttr = generatePostAttr(propSchema, tomlPath, envVar);
    const defaultAttr = getDefaultAttr(propSchema, type);

    // Special case: if type is string and enum has a single value, suggest setting that value (for example for type: "exponential-delay")
    if (propSchema.default === undefined && type === 'string' && Array.isArray(propSchema.enum) && propSchema.enum.length === 1) {
        let value = propSchema.enum[0];
        description += `\n\nSet \`${propName}: "${value}"\``;
    }

    let output = `${indent}<ResponseField name="${propName}" type="${type}"${required}${postAttr}${defaultAttr}>\n`;
    if (description) {
        output += `${indent}    ${description}\n\n`;
    }
    
    // Handle object properties
    if (type === 'object' && propSchema.properties) {
        output += `${indent}    \n`;

        if (propSchema.oneOf) {
            const variants = propSchema.oneOf;
            output += `${indent}    \n`;

            variants.forEach((variant, index) => {
                const variantName = parseVariantName(variant, index);
                output += `${indent}<Expandable title="${variantName}">\n`;
                output += generateResponseFieldsFromProperties(variant.properties, propSchema.required, level, path);
                output += generateResponseFieldsFromProperties(propSchema.properties, propSchema.required, level, path);
                output += `${indent}    </Expandable>\n`;
            });

        } else {
            output += `${indent}    <Expandable title="Properties">\n`;
            output += generateResponseFieldsFromProperties( propSchema.properties, propSchema.required, level, path);
            output += `${indent}    </Expandable>\n`;
        }
    }

    // Handle array items
    if (type === 'array' && propSchema.items) {
        output += `${indent}    \n`;
        output += `${indent}    <Expandable title="Array Items">\n`;
        output += generateResponseField('item', propSchema.items, propSchema.required, level + 2, [...path, '[]']);
        output += `${indent}    </Expandable>\n`;
    }
    
    // Handle anyOf
    if (type === 'anyOf') {
        const variants = propSchema.anyOf;
        
        // Handle the optional type case of [T, null]
        if (variants.length === 2 && variants.some(variant => variant.type === "null")) {
            let optionalVariant = variants.find(variant => variant.type !== "null")

            const optionalType = getTypeFromSchema(optionalVariant);
            output = `${indent}<ResponseField name="${propName}" type="${optionalType.type} | null"${required}${postAttr}${defaultAttr}>\n`;
            if (description) {
                output += `${indent}    ${description}\n\n`;
            }
            if (optionalVariant.description) {
                output += `${indent}    ${formatDescription(optionalVariant.description, optionalVariant.title, optionalVariant.examples)}\n`
            }
            if (optionalType.type === 'object' && optionalVariant.properties) {
                output += `${indent}    \n`;
                output += `${indent}    <Expandable title="Properties">\n`;
                output += generateResponseFieldsFromProperties(optionalVariant.properties, optionalVariant.required, level, path);
                output += `${indent}    </Expandable>\n`;

            } else if (optionalType.type === 'oneOf') {
                const oneOfVariants = optionalVariant.oneOf;
                output += `${indent}    \n`;

                oneOfVariants.forEach((variant, index) => {
                    let variantName = parseVariantName(variant, index)
                    if ((['object', 'oneOf', 'array'].some(t => variant.type.includes(t))) && variant.properties) {
                        output += generateResponseFieldsFromProperties(variant.properties, variant.required, level, path);
                    } else {
                        output += `${indent}    - \`${variantName}\` : ${formatDescription(variant.description)}\n`
                    }
                });
            }
        } else {
            output += `${indent}    \n`;

            variants.forEach((variant, index) => {
                let variantName = parseVariantName(variant, index);
                if ((['object', 'oneOf', 'array'].some(t => variant.type.includes(t))) && variant.properties) {
                    output += `${indent}    \n`;
                    output += `${indent}    <Expandable title="Properties">\n`;
                    output += generateResponseFieldsFromProperties(variant.properties, variant.required, level, path);
                    output += `${indent}    </Expandable>\n`;
                } else {
                    output += `${indent}    - \`${variantName}\` : ${formatDescription(variant.description)}\n`
                }
            });

        }
    }

    // Handle oneOf
    if (type === 'oneOf') {
        const variants = propSchema.oneOf

        output = `${indent}<ResponseField name="${propName}" ${required}${postAttr}${defaultAttr}>\n`;
        if (description) {
            output += `${indent}    ${description}\n\n`;
        }
        output += `${indent}    \n`;

        variants.forEach((variant, index) => {
            let variantName = parseVariantName(variant, index);
            if ((['object', 'oneOf', 'array'].some(t => variant.type.includes(t))) && variant.properties) {
                output += `${indent}    \n`;
                output += `${indent}    <Expandable title="${variantName || "Properties"}">\n`;
                output += `${indent}    ${formatDescription(variant.description, undefined, variant.examples)}\n\n`;
                output += generateResponseFieldsFromProperties( variant.properties, variant.required, level, path);
                output += `${indent}    </Expandable>\n`;
            } else {
                output += `${indent}    - \`${variantName}\` : ${formatDescription(variant.description)}\n`
            }
        });
    }
    
    output += `${indent}</ResponseField>\n\n`;
    return output;
}


// Whether a top-level property is a `[section]` table worth its own heading,
// i.e. it has named options underneath it. A map like `tracing-headers` is not:
// its keys are arbitrary, so it is a single settable value and belongs with the
// root options.
function isTopLevelSection(propSchema) {
    const { type } = getTypeFromSchema(propSchema);
    if (type !== 'object' && type !== 'oneOf') return false;
    return Boolean(propSchema.properties) || (propSchema.oneOf || []).some(v => v.properties);
}

// Renders one `[section]` of the config file: an `## admin` heading, the
// section's own description, then its options at the top nesting level. Dropping
// the wrapping ResponseField/Expandable is what makes the heading useful, since
// a table-of-contents jump then lands on the options themselves rather than on a
// collapsed box.
//
// Today's schema produces two shapes: a plain object of options, and a tagged
// enum whose variants are objects (`metadata-client`, `network-error-retry-policy`).
// Anything else throws, so a future server release that reshapes a section fails
// the generator loudly instead of quietly emitting an empty section.
function generateSection(name, propSchema) {
    const { type } = getTypeFromSchema(propSchema);
    const description = formatDescription(propSchema.description, propSchema.title, propSchema.examples);

    let output = `## ${name}\n\n`;
    if (description) {
        output += `${description}\n\n`;
    }
    // The heading alone does not say how to address the section as a whole,
    // which the removed wrapper's badge used to. Spell out both forms.
    output += `Configuration file section \`[${name}]\`, environment variable prefix \`${buildEnvVar([name])}__\`.\n\n`;

    const variants = (propSchema.oneOf || []).some(v => v.properties) ? propSchema.oneOf : null;

    if (variants) {
        // A tagged enum: each variant is a different shape of the same section,
        // so each gets its own Expandable, as it does when nested. Properties on
        // the section itself are shared by every variant.
        variants.forEach((variant, index) => {
            output += `<Expandable title="${parseVariantName(variant, index)}">\n`;
            if (variant.description) {
                output += `    ${formatDescription(variant.description, undefined, variant.examples)}\n\n`;
            }
            output += generateResponseFieldsFromProperties(variant.properties || {}, variant.required, -2, [name]);
            if (propSchema.properties) {
                output += generateResponseFieldsFromProperties(propSchema.properties, propSchema.required, -2, [name]);
            }
            output += `</Expandable>\n\n`;
        });
    } else if (propSchema.properties) {
        output += generateResponseFieldsFromProperties(propSchema.properties, propSchema.required, -2, [name]);
    } else {
        throw new Error(
            `Cannot render top-level section "${name}": expected an object with properties or a ` +
            `oneOf of object variants, got type="${type}". Teach generateSection() the new shape.`
        );
    }

    return output;
}

function generateRestateConfigViewer(schema) {
    // No `mode: "wide"` on purpose: it suppresses the "On this page" sidebar,
    // which this page needs, and it pins the column to a fixed width so the page
    // would no longer match the rest of the docs.
    let output = `---\ntitle: "Restate Server Configuration"\ndescription: "Reference of the configuration options for Restate Server."\n---\n\n` +
        'import Intro from "/snippets/common/default-configuration.mdx" \n' +
        '\n' +
        '<Intro />' +
        '\n\n';

    const properties = schema.properties || {};

    // Split the flattened root keys from the `[section]` tables, and put the
    // root keys first. That is the order a TOML file has to be written in, and
    // it is what lets each section carry its own heading: interleaved
    // alphabetically, as the schema lists them, a heading would sit above
    // options that do not belong to it.
    const rootKeys = {};
    const sections = {};
    Object.entries(properties).forEach(([name, propSchema]) => {
        (isTopLevelSection(propSchema) ? sections : rootKeys)[name] = propSchema;
    });

    output += '## General options\n\n';
    output += 'Options set at the root of the configuration file, above any `[section]` header.\n\n';
    output += generateResponseFieldsFromProperties(rootKeys, schema.required, -2, []);

    Object.entries(sections).forEach(([name, propSchema]) => {
        output += generateSection(name, propSchema);
    });

    return output;
}


async function generate() {
    if (!fs.existsSync(schemaPath)) {
        console.error(`Schema file not found: ${schemaPath}`);
        process.exit(1);
    }
    
    try {
        const schema = await parseJsonSchema(schemaPath);
        const mdxContent = generateRestateConfigViewer(schema);
        
        if (outputPath) {
            fs.writeFileSync(outputPath, mdxContent);
            console.log(`Schema viewer generated: ${outputPath}`);
        } else {
            console.log(mdxContent);
        }
    } catch (error) {
        console.error('Error generating schema viewer:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    generate();
}

module.exports = { generateSchemaViewer: generate };

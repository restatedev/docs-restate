#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const $RefParser = require("@apidevtools/json-schema-ref-parser");

const schemaPath = "docs/schemas/restate-server-configuration-schema.json";
const outputPath = "docs/references/server-config.mdx";

// Text an option may declare for itself next to a `$ref`.
const OWN_DOC_KEYS = ["description", "title", "examples"];
const ownDocKey = (key) => `x-own-${key}`;

// A property may declare its own `description`/`title`/`examples` next to a
// `$ref`, e.g. `trim-delay-interval` explaining what the option does while
// pointing at `FriendlyDuration`, which explains the accepted format. Both are
// worth keeping, but dereferencing merges the two nodes and the keys collide --
// and which side wins depends on the dereferencer's cache state, so options
// silently lost one or the other.
//
// Move the option's own text aside first: the merged node then keeps the
// referenced type's `description`/`title`/`examples`, and the option's own land
// under `x-own-*`, where `preservedProperties` carries them across untouched.
function stashOwnDocs(node) {
    if (Array.isArray(node)) return node.forEach(stashOwnDocs);
    if (!node || typeof node !== "object") return;

    if (typeof node.$ref === "string") {
        for (const key of OWN_DOC_KEYS) {
            if (key in node) {
                node[ownDocKey(key)] = node[key];
                delete node[key];
            }
        }
    }
    Object.values(node).forEach(stashOwnDocs);
}

async function parseJsonSchema(schemaPath) {
    try {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        stashOwnDocs(schema);
        return await $RefParser.dereference(schema, {
            mutateInputSchema: false,
            continueOnError: false,
            dereference: {
                circular: "ignore",
                preservedProperties: OWN_DOC_KEYS.map(ownDocKey)
            }
        });
    } catch (error) {
        console.error('Error parsing JSON schema:', error);
        throw error;
    }
}

// Splits a dereferenced node into the option's own prose and the referenced
// type's format text. Nodes that never went through a `$ref` carry no `x-own-*`
// keys and are returned unchanged.
function resolveDocs(propSchema) {
    const viaRef = OWN_DOC_KEYS.some(key => ownDocKey(key) in propSchema);
    if (!viaRef) {
        return {
            description: propSchema.description,
            title: propSchema.title,
            examples: propSchema.examples,
            formatHint: null,
        };
    }
    return {
        description: propSchema['x-own-description'],
        title: propSchema['x-own-title'],
        // Fall back to the type's examples; most options don't declare their own.
        examples: propSchema['x-own-examples'] ?? propSchema.examples,
        formatHint: formatHint(propSchema, propSchema['x-own-description']),
    };
}

// The referenced type's own text, introduced by its title the same way an
// option's description is ("Human-readable duration: Duration string in either
// jiff ..."). Returns null when the type adds nothing beyond what the option
// already says: an empty or title-repeating blurb ("Non-zero human-readable
// bytes"), a composite type whose variants and fields are expanded below anyway
// ("Definition of a retry policy"), or text the option's description contains.
function formatHint(typeSchema, ownDescription = '') {
    const typeDescription = (typeSchema.description || '').trim();
    const typeTitle = (typeSchema.title || '').trim();

    if (!typeDescription) return null;
    if (typeDescription === typeTitle) return null;
    // A struct's or tagged enum's fields are expanded below anyway, and a map's
    // or array's blurb describes the container rather than a value.
    const type = nonNullType(getTypeFromSchema(typeSchema).type);
    if (type === 'object' || type === 'array' || hasNamedFields(typeSchema)) return null;
    if ((ownDescription || '').includes(typeDescription)) return null;

    return typeTitle ? `${typeTitle}: ${typeDescription}` : typeDescription;
}

// Escapes prose for the MDX body: angle brackets would otherwise be read as
// JSX, and double quotes would terminate a JSX attribute.
function escapeText(text) {
    // Split by backtick-delimited code blocks, keeping the delimiters
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map(part => {
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
}

function formatDescription(description, title, examples, hint) {
    const titleStr = title ? `${title}: ` : '';
    // What the option does, then what its type accepts, then examples of it
    const hintStr = hint ? `\n\n${escapeText(hint)}` : '';
    const exampleStr = examples && Array.isArray(examples) && examples.length > 0
        ? '\n\nExamples:\n' + examples.map(ex => `${JSON.stringify(ex, null, 2)}`).join(' or ')
        : '';

    if (!description) {
        // Return title if present, even without description. No trailing colon:
        // there is nothing for it to introduce.
        return `${title || ''}${hintStr}${exampleStr}`;
    }

    const cleanDescription = escapeText(description);
    // Don't repeat the title when the description already contains it
    const titlePrefix = title && description.includes(title) ? '' : titleStr;
    return `${titlePrefix}${cleanDescription}${hintStr}${exampleStr}`;
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

// Whether a node has named options of its own, directly or in any of its
// variants. A struct or a tagged enum does; a map, a scalar, or an enum of bare
// values does not.
function hasNamedFields(schema) {
    return Boolean(schema.properties)
        || (schema.oneOf || schema.anyOf || []).some(v => v.properties);
}

// Whether an array holds tables rather than scalars. Arrays of tables are
// written as `[[key]]` in TOML and cannot be set from a single env var.
function itemsAreObjects(propSchema) {
    const items = propSchema.items;
    return Boolean(items) && (hasNamedFields(items) || items.type === 'object');
}

// The type with its `null` alternative stripped, so that `object | null` is
// classified like `object`.
function nonNullType(type) {
    return type.split(' | ').filter(t => t !== 'null').join(' | ');
}

// Whether a field is settable from a single environment variable. A whole array
// or map is, because figment parses `[a, b]` into a list and `{k=v}` into a
// dict. Individual elements are not, and neither is a struct or a tagged enum,
// whose options each carry an env var of their own.
function isLeafField(propSchema, type) {
    if (nonNullType(type) === 'array') return !itemsAreObjects(propSchema);
    return !hasNamedFields(propSchema);
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

// `post={['...']}` is a JS expression in MDX, so anything embedded in it has to
// survive a single-quoted string literal. Regex patterns are full of
// backslashes, and a raw `\d` is an unknown escape that collapses to `d`.
function escapeJsString(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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

    if (nonNullType(type) === 'array') {
        return itemsAreObjects(propSchema) ? `[[${dotted}]]` : dotted;
    }
    // Only a struct or a tagged enum is a table. A map has no fixed keys and is
    // set as one value, which is also what its env var badge says.
    return hasNamedFields(propSchema) ? `[${dotted}]` : dotted;
}

function generatePostAttr(propSchema, tomlPath, envVar) {
    let postTags = []
    if (propSchema.format) {
        postTags.push(`\'format: ${propSchema.format}\'`);
    }
    if (propSchema.pattern) {
        postTags.push(`\'pattern: ${escapeJsString(propSchema.pattern)}\'`);
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
    const docs = resolveDocs(propSchema);
    let description = formatDescription(docs.description, docs.title, docs.examples, docs.formatHint);

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
            // For `Option<T>` the variant *is* the type, so its text describes
            // the format rather than the option -- same treatment as a `$ref`.
            const variantFormat = formatDescription(
                undefined, undefined, optionalVariant.examples,
                formatHint(optionalVariant, docs.description));
            if (variantFormat) {
                // The option's description above already ends with a blank line
                output += `${indent}    ${variantFormat.replace(/^\n+/, '')}\n`
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


function generateRestateConfigViewer(schema) {
    let output = `---\ntitle: "Restate Server Configuration"\ndescription: "Reference of the configuration options for Restate Server."\nmode: "wide"\n---\n\n` +
        'import Intro from "/snippets/common/default-configuration.mdx" \n' +
        '\n' +
        '<Intro />' +
        '\n\n';

    if (schema.properties) {
        output += generateResponseFieldsFromProperties(schema.properties, schema.required, -2, []);
    }
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

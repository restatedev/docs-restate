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

// The single fixed value a field accepts, if it has one. Serde writes a tagged
// enum's discriminator this way: `"type": {"const": "exponential"}`.
function fixedValue(propSchema) {
    if (propSchema.const !== undefined) return propSchema.const;
    if (Array.isArray(propSchema.enum) && propSchema.enum.length === 1) return propSchema.enum[0];
    return undefined;
}

// Finds the discriminator of a tagged enum variant: the required property that
// accepts exactly one value, and so is what selects this variant.
function findDiscriminator(variant) {
    const required = variant.required || [];
    for (const [name, propSchema] of Object.entries(variant.properties || {})) {
        const value = fixedValue(propSchema);
        if (typeof value === 'string' && required.includes(name)) {
            return { name, value };
        }
    }
    return null;
}

// Escapes a label for use inside a JSX string attribute. Note this must NOT be
// applied to labels that go into a markdown code span, where entities are not
// decoded and `&quot;` would show up verbatim.
function attr(value) {
    return String(value).replace(/"/g, '&quot;');
}

// Renders a tagged enum: the discriminator as a normal, visible option listing
// the values it accepts, then one tab per value holding the options that value
// adds.
//
// Without this the discriminator is invisible — it only appears inside each
// variant's own box, so nothing on the page says a `type` has to be set at all,
// let alone to what. Tabs rather than collapsed boxes because picking exactly
// one is what tabs mean, and because it keeps one variant's options on screen.
function generateTaggedEnum(variants, requiredProps, path, indent) {
    const discriminators = variants.map(findDiscriminator);
    if (discriminators.some(d => d === null)) return null;

    const name = discriminators[0].name;
    if (!discriminators.every(d => d.name === name)) return null;

    // The discriminator itself, described once with every value it accepts.
    const fieldPath = [...path, name];
    const post = generatePostAttr({}, buildTomlPath(fieldPath, {}, 'string'), buildEnvVar(fieldPath));
    let output = `${indent}<ResponseField name="${name}" type="string" required${post}>\n`;
    output += `${indent}    Selects which shape this section takes. Each value accepts its own\n`;
    output += `${indent}    additional options, listed under it below.\n\n`;
    variants.forEach((variant, index) => {
        // The title is dropped: it restates the value, giving `"none" : None:
        // No retry strategy.`. Collapsed onto one line too, since a hard break
        // inside a list item ends the list and several of these are multi-paragraph.
        const description = formatDescription(variant.description, undefined, variant.examples)
            .replace(/\s+/g, ' ').trim();
        output += `${indent}    - \`"${discriminators[index].value}"\`${description ? ' : ' + description : ''}\n`;
    });
    output += `${indent}</ResponseField>\n\n`;

    // A variant whose only field is the discriminator adds nothing, so it gets
    // no tab; the bullet above already describes it.
    const withOptions = variants
        .map((variant, index) => ({ variant, value: discriminators[index].value }))
        .filter(({ variant }) => Object.keys(variant.properties || {})
            .some(key => fixedValue(variant.properties[key]) === undefined));

    if (withOptions.length === 0) return output;

    output += `${indent}Additional options for each \`${name}\`:\n\n`;
    output += `${indent}<Tabs>\n`;
    withOptions.forEach(({ variant, value }) => {
        const fields = {};
        Object.entries(variant.properties || {}).forEach(([key, schema]) => {
            if (fixedValue(schema) === undefined) fields[key] = schema;
        });
        output += `${indent}<Tab title="${attr(`${name} = "${value}"`)}">\n`;
        // A sub-table of a variant renders as a nested field here, not as a
        // heading of its own, because a heading cannot live inside a tab. So
        // `metadata-client.object-store-retry-policy` is a field while
        // `worker.snapshots.object-store-retry-policy` is a section.
        output += generateResponseFieldsFromProperties(fields, variant.required || requiredProps, -2, path);
        output += `${indent}</Tab>\n`;
    });
    output += `${indent}</Tabs>\n\n`;

    return output;
}

// Names a variant after what you actually have to write to select it, rather
// than after the Rust variant name: "Exponential" does not tell you to write
// `type = "exponential"`, and "Pretty" does not tell you to write `"pretty"`.
// Returns unescaped text; escape at the call site if it lands in an attribute.
function parseVariantName(variant, index) {
    // A tagged enum: selected by a discriminator property.
    const discriminator = findDiscriminator(variant);
    if (discriminator) {
        return `${discriminator.name} = "${discriminator.value}"`;
    }

    // A bare value the variant accepts, e.g. `"pretty"` for a log format.
    const value = fixedValue(variant);
    if (value !== undefined) {
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    // No literal to name it by, so fall back to the shape it accepts, e.g. an
    // `integer` alternative alongside a `"unlimited"` literal.
    if (variant.title) return variant.title;

    const { type } = getTypeFromSchema(variant);
    if (type && type !== 'unknown') return type;

    return `Option ${index + 1}`;
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
    const description = formatDescription(docs.description, docs.title, docs.examples, docs.formatHint);

    const envVar = isLeafField(propSchema, type) ? buildEnvVar(path) : null;
    const tomlPath = buildTomlPath(path, propSchema, type);
    let postAttr = generatePostAttr(propSchema, tomlPath, envVar);
    const defaultAttr = getDefaultAttr(propSchema, type);

    let output = `${indent}<ResponseField name="${propName}" type="${type}"${required}${postAttr}${defaultAttr}>\n`;
    if (description) {
        output += `${indent}    ${description}\n\n`;
    }
    
    // The nested boxes below are fallbacks. With the current schema every struct
    // and tagged enum is rendered as a section by generateSection() or inside a
    // tab by generateTaggedEnum(), so only the array-of-tables box (the
    // deprecated `kafka-clusters`) is reached. They stay so that a shape those
    // two cannot place still renders instead of vanishing.
    if (type === 'object' && propSchema.properties) {
        output += `${indent}    \n`;

        if (propSchema.oneOf) {
            const variants = propSchema.oneOf;
            output += `${indent}    \n`;

            // Shared options apply to every variant, so emit them once rather
            // than repeating the same keys inside each box.
            output += generateResponseFieldsFromProperties(propSchema.properties, propSchema.required, level, path);

            variants.forEach((variant, index) => {
                const variantName = parseVariantName(variant, index);
                output += `${indent}<Expandable title="${attr(variantName)}">\n`;
                output += generateResponseFieldsFromProperties(variant.properties, propSchema.required, level, path);
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
        if (itemsAreObjects(propSchema)) {
            // An array of tables: the element has real fields of its own, so it
            // is worth a box.
            output += `${indent}    \n`;
            output += `${indent}    <Expandable title="Array Items">\n`;
            output += generateResponseField('item', propSchema.items, propSchema.required, level + 2, [...path, '[]']);
            output += `${indent}    </Expandable>\n`;
        } else {
            // An array of scalars. The element has no key of its own, so a box
            // around it costs a click to reveal a nameless row. List the
            // permitted values inline instead, and emit nothing when the element
            // is a free-form string.
            const itemVariants = (propSchema.items.oneOf || propSchema.items.anyOf || [])
                .filter(v => fixedValue(v) !== undefined);
            if (itemVariants.length > 0) {
                output += `${indent}    \n`;
                itemVariants.forEach((variant, index) => {
                    output += `${indent}    - \`${parseVariantName(variant, index)}\` : ${formatDescription(variant.description)}\n`;
                });
            }
        }
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

        // Name the value's shape rather than saying `oneOf`, which describes the
        // schema and not what to write: `string` for a choice of literals,
        // `object` for a tagged enum, `string | integer` for a mix of both.
        const shape = [...new Set(variants.map(v => getTypeFromSchema(v).type))]
            .filter(t => t !== 'unknown').join(' | ') || 'oneOf';
        output = `${indent}<ResponseField name="${propName}" type="${shape}"${required}${postAttr}${defaultAttr}>\n`;
        if (description) {
            output += `${indent}    ${description}\n\n`;
        }
        output += `${indent}    \n`;

        // A nested tagged enum, e.g. a retry policy: same treatment as at
        // section level, so `type` is visible without opening anything.
        const tagged = variants.some(v => v.properties)
            ? generateTaggedEnum(variants, propSchema.required, path, `${indent}    `)
            : null;

        if (tagged) {
            output += tagged;
        } else {
            variants.forEach((variant, index) => {
                let variantName = parseVariantName(variant, index);
                if ((['object', 'oneOf', 'array'].some(t => variant.type.includes(t))) && variant.properties) {
                    output += `${indent}    \n`;
                    output += `${indent}    <Expandable title="${attr(variantName || "Properties")}">\n`;
                    output += `${indent}    ${formatDescription(variant.description, undefined, variant.examples)}\n\n`;
                    output += generateResponseFieldsFromProperties( variant.properties, variant.required, level, path);
                    output += `${indent}    </Expandable>\n`;
                } else {
                    output += `${indent}    - \`${variantName}\` : ${formatDescription(variant.description)}\n`
                }
            });
        }
    }
    
    output += `${indent}</ResponseField>\n\n`;
    return output;
}


// Unwraps the `anyOf: [T, null]` that an optional sub-table is modelled as, so
// a nullable section (`worker.invoker.action-throttling`) is treated like any
// other section rather than as an opaque field.
function unwrapOptional(propSchema) {
    const variants = propSchema.anyOf;
    if (!Array.isArray(variants) || variants.length !== 2) return propSchema;
    if (!variants.some(v => v.type === 'null')) return propSchema;
    return variants.find(v => v.type !== 'null') || propSchema;
}

// Whether a property is a `[section]` table worth its own heading, i.e. it has
// named options underneath it. A map like `tracing-headers` is not: its keys are
// arbitrary, so it is a single settable value and belongs with the plain options.
function isSection(propSchema) {
    return hasNamedFields(unwrapOptional(propSchema));
}

// Separates a table's own options from its sub-tables. Options are rendered
// under the table's own heading; sub-tables each get a heading of their own.
function splitProperties(properties) {
    const options = {};
    const subSections = {};
    Object.entries(properties || {}).forEach(([name, propSchema]) => {
        (isSection(propSchema) ? subSections : options)[name] = propSchema;
    });
    return { options, subSections };
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
function generateSection(path, propSchema, level) {
    const schema = unwrapOptional(propSchema);
    const { type } = getTypeFromSchema(schema);
    const dotted = path.join('.');
    // An optional section (`anyOf: [T, null]`) carries its own text on the
    // wrapper, so look there first and fall back to the unwrapped type's.
    const outer = resolveDocs(propSchema);
    const inner = schema === propSchema ? outer : resolveDocs(schema);
    const description = formatDescription(
        outer.description || inner.description,
        outer.title || inner.title,
        outer.examples || inner.examples
    );

    let output = `${'#'.repeat(level)} ${dotted}\n\n`;
    if (description) {
        output += `${description}\n\n`;
    }
    // The heading alone does not say how to address the section as a whole,
    // which the removed wrapper's badge used to. Spell out both forms.
    output += `Configuration file section \`[${dotted}]\`, environment variable prefix \`${buildEnvVar(path)}__\`.\n\n`;

    const variants = (schema.oneOf || []).some(v => v.properties) ? schema.oneOf : null;

    if (!variants && !schema.properties) {
        throw new Error(
            `Cannot render section "${dotted}": expected an object with properties or a ` +
            `oneOf of object variants, got type="${type}". Teach generateSection() the new shape.`
        );
    }

    // Everything belonging to this table has to be emitted before the first
    // sub-table heading, because from that heading onwards the reader — and the
    // table of contents — attributes what follows to the sub-table. That is why
    // the section's own variant boxes come before the recursion and not after.
    const { options, subSections } = splitProperties(schema.properties);
    output += generateResponseFieldsFromProperties(options, schema.required, -2, path);

    if (variants) {
        // Options the section declares itself apply to every variant, so they
        // are emitted once above rather than repeated per variant.
        const tagged = generateTaggedEnum(variants, schema.required, path, '');
        if (tagged) {
            output += tagged;
        } else {
            // Not a tagged enum, so there is no value to name the variants by.
            variants.forEach((variant, index) => {
                output += `<Expandable title="${attr(parseVariantName(variant, index))}">\n`;
                if (variant.description) {
                    output += `    ${formatDescription(variant.description, undefined, variant.examples)}\n\n`;
                }
                output += generateResponseFieldsFromProperties(variant.properties || {}, variant.required, -2, path);
                output += `</Expandable>\n\n`;
            });
        }
    }

    Object.entries(subSections).forEach(([name, subSchema]) => {
        output += generateSection([...path, name], subSchema, level + 1);
    });

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
        (isSection(propSchema) ? sections : rootKeys)[name] = propSchema;
    });

    output += '## General options\n\n';
    output += 'Options set at the root of the configuration file, above any `[section]` header.\n\n';
    output += generateResponseFieldsFromProperties(rootKeys, schema.required, -2, []);

    Object.entries(sections).forEach(([name, propSchema]) => {
        output += generateSection([name], propSchema, 2);
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

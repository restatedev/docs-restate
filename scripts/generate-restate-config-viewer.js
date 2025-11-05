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

function formatDescription(description, title,  examples) {
    if (!description) return '';
    // Escape HTML-like syntax in code blocks and regular text
    const cleanDescription = description
        .replace(/\n\n/g, '\n\n')
        // Preserve code blocks with backticks but escape any HTML-like content within
        .replace(/`([^`]+)`/g, (match, code) => {
            return '`' + code.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '`';
        })
        // Escape standalone HTML-like tags that aren't in code blocks
        .replace(/<(?!\/?\w+[^>]*>)/g, '&lt;')
        .replace(/(?<!<[^>]*)>/g, '&gt;')
        // Convert markdown links to proper format
        .replace(/\[(.*?)\]\((.*?)\)/g, '[$1]($2)')
        // Escape quotes for JSX attributes
        .replace(/"/g, '\\"')  || ''

    const exampleStr = examples && Array.isArray(examples) && examples.length > 0
        ? '\n\nExamples:\n' + examples.map(ex => `${JSON.stringify(ex, null, 2)}`).join(' or ')
        : '';
    const titleStr = title ? `${title}: ` : '';
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

function getDefaultValueString(propSchema, type) {
    let value = propSchema.default;
    if (value === undefined) return null;
    else if (value === null) return `default=null`;
    else if (typeof value === 'string') return `default="${value}"`;
    // needs to be checked before 'object' because typeof array is 'object'
    else if (type === 'array') return `default=${JSON.stringify(value)}`
    else if (typeof value === 'object') return null
    else return `default=${String(value)}`;
}

function generatePostAttr(propSchema, type) {
    let postTags = []
    const defaultValue = getDefaultValueString(propSchema, type)
    if (defaultValue) {
        postTags.push(`\'${defaultValue}\'`);
    }
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

function generateResponseFieldsFromProperties(properties, requiredProps = [], level = 0) {
    let generatedOutput = '';
    Object.entries(properties).forEach(([subPropName, subPropSchema]) => {
        generatedOutput += generateResponseField(
            subPropName,
            subPropSchema,
            requiredProps.includes(subPropName),
            level + 2
        );
    });
    return generatedOutput
}

function generateResponseField(propName, propSchema, isRequired = false, level = 0) {
    const indent = '    '.repeat(level);
    const { type, optional } = getTypeFromSchema(propSchema);
    const required = isRequired && !optional ? ' required' : '';
    let description = formatDescription(propSchema.description, propSchema.title, propSchema.examples);

    let postAttr = generatePostAttr(propSchema, type);

    // Special case: if type is string and enum has a single value, suggest setting that value (for example for type: "exponential-delay")
    if (propSchema.default === undefined && type === 'string' && Array.isArray(propSchema.enum) && propSchema.enum.length === 1) {
        let value = propSchema.enum[0];
        description += `\n\nSet \`${propName}: "${value}"\``;
    }

    let output = `${indent}<ResponseField name="${propName}" type="${type}"${required}${postAttr}>\n`;
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
                output = generateResponseFieldsFromProperties(output, variant.properties, propSchema.required, level);
                output = generateResponseFieldsFromProperties(output, propSchema.properties, propSchema.required, level);
                output += `${indent}    </Expandable>\n`;
            });

        } else {
            output += `${indent}    <Expandable title="Properties">\n`;
            output = generateResponseFieldsFromProperties(output, propSchema.properties, propSchema.required, level);
            output += `${indent}    </Expandable>\n`;
        }
    }
    
    // Handle array items
    if (type === 'array' && propSchema.items) {
        output += `${indent}    \n`;
        output += `${indent}    <Expandable title="Array Items">\n`;
        output += generateResponseField('item', propSchema.items, propSchema.required, level + 2);
        output += `${indent}    </Expandable>\n`;
    }
    
    // Handle anyOf
    if (type === 'anyOf') {
        const variants = propSchema.anyOf;
        
        // Handle the optional type case of [T, null]
        if (variants.length === 2 && variants.some(variant => variant.type === "null")) {
            let optionalVariant = variants.find(variant => variant.type !== "null")

            const optionalType = getTypeFromSchema(optionalVariant);
            output = `${indent}<ResponseField name="${propName}" type="${optionalType.type} | null"${required}${postAttr}>\n`;
            if (description) {
                output += `${indent}    ${description}\n\n`;
            }
            if (optionalVariant.description) {
                output += `${indent}    ${formatDescription(optionalVariant.description, optionalVariant.title, optionalVariant.examples)}\n`
            }
            if (optionalType.type === 'object' && optionalVariant.properties) {
                output += `${indent}    \n`;
                output += `${indent}    <Expandable title="Properties">\n`;
                output = generateResponseFieldsFromProperties(output, optionalVariant.properties, optionalVariant.required, level);
                output += `${indent}    </Expandable>\n`;

            } else if (optionalType.type === 'oneOf') {
                const oneOfVariants = optionalVariant.oneOf;
                output += `${indent}    \n`;

                oneOfVariants.forEach((variant, index) => {
                    let variantName = parseVariantName(variant, index)
                    if ((['object', 'oneOf', 'array'].some(t => variant.type.includes(t))) && variant.properties) {
                        output = generateResponseFieldsFromProperties(output, variant.properties, variant.required, level);
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
                    output = generateResponseFieldsFromProperties(output, variant.properties, variant.required, level);
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

        output = `${indent}<ResponseField name="${propName}" ${required}${postAttr}>\n`;
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
                output = generateResponseFieldsFromProperties(output, variant.properties, variant.required, level);
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
        output = generateResponseFieldsFromProperties(output, schema.properties, schema.required, 0);
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
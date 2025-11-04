#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const $RefParser = require("@apidevtools/json-schema-ref-parser");

const schemaPath = "docs/schemas/restate-server-configuration-schema.json";
const outputPath = "docs/references/server-config.mdx";

async function parseJsonSchema(schemaPath) {
    try {
        // Use $RefParser directly to dereference all $ref pointers
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

function formatDescription(description, examples) {
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
        .replace(/"/g, '\\"')

    const exampleStr = examples && Array.isArray(examples) && examples.length > 0
        ? '\n\nExamples:\n' + examples.map(ex => `${JSON.stringify(ex, null, 2)}`).join(' or ')
        : '';
    return cleanDescription + exampleStr;
}

function getTypeFromSchema(propSchema) {
    if (propSchema.type) {
        if (Array.isArray(propSchema.type)) {
            // Handle union types like ["string", "null"]
            const nonNullTypes = propSchema.type.filter(t => t !== 'null');
            const isOptional = propSchema.type.includes('null');
            return {
                type: nonNullTypes.length === 1 ? nonNullTypes[0] : nonNullTypes.join(' | '),
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

function generateResponseField(propName, propSchema, isRequired = false, level = 0) {
    const indent = '    '.repeat(level);
    const { type, optional } = getTypeFromSchema(propSchema);
    const required = isRequired && !optional ? ' required' : '';
    let description = formatDescription(propSchema.description|| propSchema.title || '');
    
    // Format default value properly for the attribute
    let defaultAttr = '';
    let defaultStr = '';
    if (propSchema.default !== undefined && propSchema.default !== null) {
        if (typeof propSchema.default === 'string') {
            defaultStr = `"${propSchema.default}"`;
        } else if (typeof propSchema.default === 'object') {
            defaultStr = JSON.stringify(propSchema.default);
        } else {
            defaultStr = `${String(propSchema.default)}`;
        }
        defaultAttr = ` default={${defaultStr}}`;
    } else {
        if (type === 'string' && propSchema.enum !== undefined && Array.isArray(propSchema.enum) && propSchema.enum.length > 0) {
            // If enum of strings is defined, use the first enum value as default
            let defaultValue = propSchema.enum[0];
            if (typeof defaultValue === 'string') {
                defaultStr = `"${defaultValue}"`;
                defaultAttr = ` default={${defaultStr}}`;
            } else if (typeof defaultValue === 'object') {
                defaultStr = JSON.stringify(defaultValue);
            } else {
                defaultStr = `${String(defaultValue)}`;
            }
            defaultAttr = ` default={${defaultStr}}`;
        }
    }

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
    if (propSchema.pattern) {
        postTags.push(`\'pattern: ${propSchema.pattern}\'`);
    }

    const postAttr = ` post={[${postTags.join(",")}]}`;

    let output = `${indent}<ResponseField name="${propName}" type="${type}"${required}${defaultAttr}${postAttr}>\n`;
    
    if (description) {
        output += `${indent}    ${description}\n\n`;
    }
    
    // Handle object properties
    if (type === 'object' && propSchema.properties) {
        const requiredProps = propSchema.required || [];
        output += `${indent}    \n`;
        output += `${indent}    <Expandable title="Properties">\n`;
        
        Object.entries(propSchema.properties).forEach(([subPropName, subPropSchema]) => {
            output += generateResponseField(
                subPropName, 
                subPropSchema, 
                requiredProps.includes(subPropName), 
                level + 2
            );
        });
        
        output += `${indent}    </Expandable>\n`;
    }
    
    // Handle array items
    if (type === 'array' && propSchema.items) {
        output += `${indent}    \n`;
        output += `${indent}    <Expandable title="Array Items">\n`;
        output += generateResponseField('item', propSchema.items, false, level + 2);
        output += `${indent}    </Expandable>\n`;
    }
    
    // Handle anyOf
    if (type === 'anyOf') {
        const variants = propSchema.anyOf;
        
        // Handle the optional type case of [T, null]
        if (variants.length === 2 && variants.some(variant => variant.type === "null")) {
            let optionalVariant = variants.find(variant => variant.type !== "null")

            const optionalType = getTypeFromSchema(optionalVariant);
            output = `${indent}<ResponseField name="${propName}" type="${optionalType.type} | null"${required}${defaultAttr}${postAttr}>\n`;
            if (description) {
                output += `${indent}    ${description}\n\n`;
            }
            if (optionalVariant.description) {
                output += `${indent}    ${formatDescription(optionalVariant.description, optionalVariant.examples)}\n`
            }
            if (optionalType.type === 'object' && optionalVariant.properties) {
                const requiredProps = optionalVariant.required || [];
                output += `${indent}    \n`;
                output += `${indent}    <Expandable title="Properties">\n`;

                Object.entries(optionalVariant.properties).forEach(([subPropName, subPropSchema]) => {
                    output += generateResponseField(
                        subPropName,
                        subPropSchema,
                        requiredProps.includes(subPropName),
                        level + 2
                    );
                });

                output += `${indent}    </Expandable>\n`;
            } else if (optionalType.type === 'oneOf') {
                const oneOfVariants = optionalVariant.oneOf;
                output += `${indent}    \n`;

                oneOfVariants.forEach((variant, index) => {
                    let variantName = '';
                    if (variant.enum && variant.enum.length === 1) {
                        let variantValue = variant.enum[0];
                        if (typeof variantValue === 'string') {
                            variantName = `"${variantValue}"`;
                        } else if (typeof variantValue === 'object') {
                            variantName = JSON.stringify(variantValue);
                        } else {
                            variantName = `${String(variantValue)}`;
                        }
                    } else if (variant.title) {
                        variantName = `Option ${index + 1}: ${variant.title}`;
                    } else if (variant.const !== undefined) {
                        variantName = `"${variant.const}"`;
                    } else {
                        variantName = `Option ${index + 1}`;
                    }
                    if ((['object', 'oneOf', 'array'].some(t => variant.type.includes(t))) && variant.properties) {
                        const requiredProps = variant.required || [];
                        Object.entries(variant.properties).forEach(([subPropName, subPropSchema]) => {
                            output += generateResponseField(
                                subPropName,
                                subPropSchema,
                                requiredProps.includes(subPropName),
                                level + 2
                            );
                        });

                    } else {
                        output += `${indent}    - \`${variantName}\` : ${formatDescription(variant.description)}\n`
                    }
                });
            }
        } else {
            output += `${indent}    \n`;

            variants.forEach((variant, index) => {
                let variantName = '';
                if (variant.enum && variant.enum.length === 1) {
                    let variantValue = variant.enum[0];
                    if (typeof variantValue === 'string') {
                        variantName = `"${variantValue}"`;
                    } else if (typeof variantValue === 'object') {
                        variantName = JSON.stringify(variantValue);
                    } else {
                        variantName = `${String(variantValue)}`;
                    }
                } else if (variant.title) {
                    variantName = `Option ${index + 1}: ${variant.title}`;
                } else if (variant.const !== undefined) {
                    variantName = `"${variant.const}"`;
                } else {
                    variantName = `Option ${index + 1}`;
                }
                if ((['object', 'oneOf', 'array'].some(t => variant.type.includes(t))) && variant.properties) {
                    const requiredProps = variant.required || [];
                    output += `${indent}    \n`;
                    output += `${indent}    <Expandable title="Properties">\n`;

                    Object.entries(variant.properties).forEach(([subPropName, subPropSchema]) => {
                        output += generateResponseField(
                            subPropName,
                            subPropSchema,
                            requiredProps.includes(subPropName),
                            level + 2
                        );
                    });

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
        console.log(variants);

        output = `${indent}<ResponseField name="${propName}" ${required}${defaultAttr}${postAttr}>\n`;

        if (description) {
            output += `${indent}    ${description}\n\n`;
        }
        output += `${indent}    \n`;

        variants.forEach((variant, index) => {
            let variantName = '';
            if (variant.enum && variant.enum.length === 1) {
                let variantValue = variant.enum[0];
                if (typeof variantValue === 'string') {
                    variantName = `"${variantValue}"`;
                } else if (typeof variantValue === 'object') {
                    variantName = JSON.stringify(variantValue);
                } else {
                    variantName = `${String(variantValue)}`;
                }
            } else if (variant.title) {
                variantName = `Option ${index + 1}: ${variant.title}`;
            } else if (variant.const !== undefined) {
                variantName = `"${variant.const}"`;
            } else {
                variantName = `Option ${index + 1}`;
            }
            if ((['object', 'oneOf', 'array'].some(t => variant.type.includes(t))) && variant.properties) {
                const requiredProps = variant.required || [];
                output += `${indent}    \n`;
                output += `${indent}    <Expandable title="${variantName || "Properties"}">\n`;
                output += `${indent}    ${formatDescription(variant.description)}\n\n`;

                Object.entries(variant.properties).forEach(([subPropName, subPropSchema]) => {
                    output += generateResponseField(
                        subPropName,
                        subPropSchema,
                        requiredProps.includes(subPropName),
                        level + 2
                    );
                });

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
        const requiredProps = schema.required || [];

        Object.entries(schema.properties).forEach(([propName, propSchema]) => {
            output += generateResponseField(
                propName,
                propSchema,
                requiredProps.includes(propName),
                0
            );
        });
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
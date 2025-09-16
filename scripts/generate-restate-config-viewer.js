#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const schemaPath = "docs/schemas/restate-server-configuration-schema.json";
const outputPath = "docs/references/server-config.mdx";

function parseJsonSchema(schemaPath) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);
    return schema;
}

function formatDescription(description) {
    if (!description) return '';
    // Convert markdown links to proper format and escape quotes
    return description
        .replace(/\n\n/g, '\n\n')
        .replace(/`([^`]+)`/g, '`$1`')
        .replace(/\[(.*?)\]\((.*?)\)/g, '[$1]($2)')
        .replace(/"/g, '\\"');
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
    const description = formatDescription(propSchema.description || propSchema.title || '');
    
    // Format default value properly for the attribute
    let defaultAttr = '';
    if (propSchema.default !== undefined && propSchema.default !== null) {
        let defaultStr = '';
        if (typeof propSchema.default === 'string') {
            defaultStr = `"${propSchema.default}"`;
        } else if (typeof propSchema.default === 'object') {
            defaultStr = JSON.stringify(propSchema.default);
        } else {
            defaultStr = `${String(propSchema.default)}`;
        }
        // Escape quotes for the attribute
        // const escapedDefault = defaultStr.replace(/"/g, '&quot;');
        defaultAttr = ` default={${defaultStr}}`;
    }
    
    let output = `${indent}<ResponseField name="${propName}" type="${type}"${required}${defaultAttr}>\n`;
    
    if (description) {
        output += `${indent}    ${description}\n`;
    }
    
    // Handle object properties
    if (propSchema.type === 'object' && propSchema.properties) {
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
    if (propSchema.type === 'array' && propSchema.items) {
        output += `${indent}    \n`;
        output += `${indent}    <Expandable title="Array Items">\n`;
        output += generateResponseField('item', propSchema.items, false, level + 2);
        output += `${indent}    </Expandable>\n`;
    }
    
    // Handle oneOf/anyOf
    if (propSchema.oneOf || propSchema.anyOf) {
        const variants = propSchema.oneOf || propSchema.anyOf;
        output += `${indent}    \n`;
        output += `${indent}    <Expandable title="Options">\n`;
        
        variants.forEach((variant, index) => {
            const variantName = variant.title || `option-${index + 1}`;
            output += generateResponseField(variantName, variant, false, level + 2);
        });
        
        output += `${indent}    </Expandable>\n`;
    }
    
    output += `${indent}</ResponseField>\n\n`;
    return output;
}

function expandDefinitions(schema, definitions) {
    // Helper function to resolve $ref definitions
    function resolveRef(propSchema) {
        if (propSchema.$ref && propSchema.$ref.startsWith('#/definitions/')) {
            const defName = propSchema.$ref.split('/').pop();
            if (definitions[defName]) {
                return { ...definitions[defName], _refName: defName };
            }
        }
        return propSchema;
    }
    
    // Recursively expand references in the schema
    function expandRefs(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        if (obj.$ref) {
            return expandRefs(resolveRef(obj));
        }
        
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'properties' && typeof value === 'object') {
                result[key] = {};
                for (const [propName, propSchema] of Object.entries(value)) {
                    result[key][propName] = expandRefs(propSchema);
                }
            } else if (Array.isArray(value)) {
                result[key] = value.map(item => expandRefs(item));
            } else if (typeof value === 'object') {
                result[key] = expandRefs(value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }
    
    return expandRefs(schema);
}

function generateRestateConfigViewer(schema) {
    let output = `---\ntitle: "Restate Server Configuration"\ndescription: "Reference of the configuration options for Restate Server."\nmode: "wide"\n---\n\n` +
        'import Intro from "/snippets/common/default-configuration.mdx" \n' +
        '\n' +
        '<Intro />' +
        '\n\n';
    
    // Expand definitions into the main schema
    const definitions = schema.definitions || {};
    const expandedSchema = expandDefinitions(schema, definitions);
    
    if (expandedSchema.properties) {
        const requiredProps = expandedSchema.required || [];
        
        Object.entries(expandedSchema.properties).forEach(([propName, propSchema]) => {
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

function main() {
    if (!fs.existsSync(schemaPath)) {
        console.error(`Schema file not found: ${schemaPath}`);
        process.exit(1);
    }
    
    try {
        const schema = parseJsonSchema(schemaPath);
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
    main();
}

module.exports = { generateSchemaViewer: generateRestateConfigViewer };
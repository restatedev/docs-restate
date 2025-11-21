const fs = require("fs");
const path = require("path");

const GUIDES_DIR = path.resolve("./docs/guides");
const OVERVIEW_FILE = path.join(GUIDES_DIR, "index.mdx");

/**
 * Parses frontmatter from an MDX file
 * @param {string} content - File content
 * @returns {object} Parsed frontmatter object
 */
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
        return {};
    }
    
    const frontmatterText = match[1];
    const frontmatter = {};
    
    // Simple YAML parser for title, description, and tags
    const lines = frontmatterText.split('\n');
    let inTagsArray = false;
    let currentTags = [];
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Handle tags array
        if (trimmedLine.startsWith('tags:')) {
            const tagsValue = trimmedLine.slice(5).trim();
            if (tagsValue.startsWith('[') && tagsValue.endsWith(']')) {
                // Inline array format: tags: ["recipe", "development"]
                const tagsContent = tagsValue.slice(1, -1);
                currentTags = tagsContent.split(',').map(tag => 
                    tag.trim().replace(/^["']|["']$/g, '')
                ).filter(tag => tag.length > 0);
                frontmatter.tags = currentTags;
            } else if (tagsValue === '[' || tagsValue === '') {
                // Start of multiline array
                inTagsArray = true;
                currentTags = [];
            }
            continue;
        }
        
        if (inTagsArray) {
            if (trimmedLine === ']') {
                // End of tags array
                inTagsArray = false;
                frontmatter.tags = currentTags;
                continue;
            } else if (trimmedLine.startsWith('-')) {
                // Array item: - "recipe"
                const tag = trimmedLine.slice(1).trim().replace(/^["']|["']$/g, '');
                if (tag) currentTags.push(tag);
                continue;
            }
        }
        
        // Handle regular key-value pairs
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1 && !inTagsArray) {
            const key = line.slice(0, colonIndex).trim();
            let value = line.slice(colonIndex + 1).trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            
            frontmatter[key] = value;
        }
    }
    
    return frontmatter;
}

/**
 * Groups guides by their tags
 * @param {Array} guides - Array of guide objects
 * @returns {Object} Object with tags as keys and arrays of guides as values
 */
function groupGuidesByTags(guides) {
    const groupedGuides = {};


    for (const guide of guides) {
        const tags = guide.tags || ['uncategorized'];
        
        for (const tag of tags) {
            if (!groupedGuides[tag]) {
                groupedGuides[tag] = [];
            }
            groupedGuides[tag].push(guide);
        }
    }
    
    return groupedGuides;
}

/**
 * Maps tags to human-readable section headers
 * @param {string} tag - The tag name
 * @returns {string} Human-readable header
 */
function getHeaderForTag(tag) {
    const tagHeaders = {
        'recipe': 'Recipes',
        'development': 'Development Guides', 
        'deployment': 'Deployment Guides',
        'integration': 'Integrations',
        'uncategorized': 'Other Guides'
    };
    
    return tagHeaders[tag] || tag.charAt(0).toUpperCase() + tag.slice(1) + ' Guides';
}

/**
 * Generates the guides/index.mdx content
 * @param {Array} guides - Array of guide objects
 * @returns {string} Complete MDX content
 */
function generateOverviewContent(guides) {
    const validGuides = guides.filter(guide => guide.title && guide.description);
    
    // Group guides by tags
    const groupedGuides = groupGuidesByTags(validGuides);
    
    // Define preferred tag order
    const tagOrder = ['recipe', 'development', 'deployment', 'integration', 'uncategorized'];
    
    // Generate sections for each tag group
    const sections = [];
    
    for (const tag of tagOrder) {
        if (!groupedGuides[tag] || groupedGuides[tag].length === 0) {
            continue;
        }
        
        const tagGuides = groupedGuides[tag];
        // Sort guides within each section alphabetically by title
        tagGuides.sort((a, b) => a.title.localeCompare(b.title));
        
        const productCards = tagGuides.map(guide => {
            const guideName = guide.filename.replace('.mdx', '');
            const imgPath = `/img/guides/${guideName}/${guideName}.png`;
            const href = `/guides/${guideName}`;
            
            return `    <Card
        title="${guide.title}"
        href="${href}"
        img="${imgPath}"
    > 
        ${guide.description} 
    </Card>`;
        }).join('\n');
        
        const sectionHeader = getHeaderForTag(tag);
        sections.push(`## ${sectionHeader}

<CardGroup cols={3}>
${productCards}
</CardGroup>`);
    }
    
    // Handle any remaining tags not in the preferred order
    for (const tag of Object.keys(groupedGuides)) {
        if (!tagOrder.includes(tag) && groupedGuides[tag].length > 0) {
            const tagGuides = groupedGuides[tag];
            tagGuides.sort((a, b) => a.title.localeCompare(b.title));
            
            const productCards = tagGuides.map(guide => {
                const guideName = guide.filename.replace('.mdx', '');
                const imgPath = `/img/guides/${guideName}/${guideName}.png`;
                const href = `/guides/${guideName}`;
                
                return `    <ProductCard
        title="${guide.title}"
        description="${guide.description}"
        href="${href}"
        img="${imgPath}"
        model="Microservices"
        type="Recipe"
    />`;
            }).join('\n');
            
            const sectionHeader = getHeaderForTag(tag);
            sections.push(`## ${sectionHeader}

<Columns cols={3}>
${productCards}
</Columns>`);
        }
    }

    return `---
mode: "wide"
title: "Guides"
sidebarTitle: "Overview"
description: "Learn how to do common tasks with Restate."
---

import { ProductCard } from '/snippets/blocks/guides/product-cards.mdx';

${sections.join('\n\n')}
`;
}

/**
 * Main function to generate the overview page
 */
function generateGuidesOverview() {
    try {
        console.log("🔄 Generating guides overview...");
        
        // Read all files in the guides directory
        const files = fs.readdirSync(GUIDES_DIR);
        const mdxFiles = files.filter(file => 
            file.endsWith('.mdx') && 
            file !== 'index.mdx' // Exclude the overview file itself
        );
        
        console.log(`📁 Found ${mdxFiles.length} guide files:`, mdxFiles);
        
        const guides = [];
        
        for (const file of mdxFiles) {
            const filePath = path.join(GUIDES_DIR, file);
            
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Skip empty files or files that are just redirects
                if (content.trim().length < 50) {
                    console.log(`⚠️  Skipping ${file} - file too short or empty`);
                    continue;
                }
                
                const frontmatter = parseFrontmatter(content);
                
                if (frontmatter.title && frontmatter.description) {
                    guides.push({
                        filename: file,
                        title: frontmatter.title,
                        description: frontmatter.description,
                        tags: frontmatter.tags || []
                    });
                    console.log(`✅ Processed ${file}: "${frontmatter.title}" (tags: ${(frontmatter.tags || []).join(', ') || 'none'})`);
                } else {
                    console.log(`⚠️  Skipping ${file} - missing title or description in frontmatter`);
                }
            } catch (error) {
                console.log(`❌ Error reading ${file}:`, error.message);
            }
        }
        
        // Generate the overview content
        const overviewContent = generateOverviewContent(guides);
        
        // Write the overview file
        fs.writeFileSync(OVERVIEW_FILE, overviewContent, 'utf8');
        
        console.log(`✅ Generated overview with ${guides.length} guides`);
        console.log(`📝 Written to: ${OVERVIEW_FILE}`);
        
    } catch (error) {
        console.error("❌ Error generating guides overview:", error);
    }
}

// Export for use in other scripts
module.exports = { generateGuidesOverview };

// Run if called directly
if (require.main === module) {
    generateGuidesOverview();
}
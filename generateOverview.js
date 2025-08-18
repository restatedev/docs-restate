const fs = require("fs");
const path = require("path");

const GUIDES_DIR = path.resolve("./docs/guides");
const OVERVIEW_FILE = path.join(GUIDES_DIR, "overview.mdx");

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
    
    // Simple YAML parser for title and description
    const lines = frontmatterText.split('\n');
    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
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
 * Generates the overview.mdx content
 * @param {Array} guides - Array of guide objects
 * @returns {string} Complete MDX content
 */
function generateOverviewContent(guides) {
    const validGuides = guides.filter(guide => guide.title && guide.description);
    
    // Sort guides alphabetically by title
    validGuides.sort((a, b) => a.title.localeCompare(b.title));
    
    const productCards = validGuides.map(guide => {
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

    return `---
mode: "wide"
title: "Guides"
sidebarTitle: "Overview"
description: "Learn how to do common tasks with Restate."
---

import { ProductCard } from '/snippets/blocks/guides/product-cards.mdx';

## Recipes

<Columns cols={3}>
${productCards}
</Columns>
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
            file !== 'overview.mdx' // Exclude the overview file itself
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
                        description: frontmatter.description
                    });
                    console.log(`✅ Processed ${file}: "${frontmatter.title}"`);
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
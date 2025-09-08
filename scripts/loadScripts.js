const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { generateGuidesOverview } = require("./generateOverview");

const MDX_DIR = path.resolve("./docs"); // Folder with your .mdx files
const SNIPPET_DIR = path.resolve("./snippets"); // Folder with code to load
const GUIDES_DIR = path.resolve("./docs/guides"); // Folder with guide files

const LANGUAGE_SYMBOLS = {
    ts: {
        commentSymbol: "//",
        serviceSymbol: ["restate.service", "restate.object", "restate.workflow"],
    },
    java: {
        commentSymbol: "//",
        serviceSymbol: ["@Service", "@VirtualObject", "@Workflow", "@RestateService", "@RestateVirtualObject", "@RestateWorkflow"],
    },
    kotlin: {
        commentSymbol: "//",
        serviceSymbol: ["@Service", "@VirtualObject", "@Workflow", "@RestateService", "@RestateVirtualObject", "@RestateWorkflow"],
    },
    python: {
        commentSymbol: "#",
        serviceSymbol: ["= VirtualObject(", "= restate.VirtualObject(", "= Service(", "= restate.Service(", "= Workflow(", "= restate.Workflow("],
    },
    go: {
        commentSymbol: "//",
        serviceSymbol: ["struct{}"],
    },
    proto: {
        commentSymbol: "//",
        serviceSymbol: [],
    },
    rust: {
        commentSymbol: "//",
        serviceSymbol: ["#[restate_sdk::service]", "#[restate_sdk::object]", "#[restate_sdk::workflow]"],
    },
    toml: {
        commentSymbol: "#",
        serviceSymbol: [],
    }
};

function extractLanguageSymbol(filePath) {
    if (filePath.endsWith(".java")) return LANGUAGE_SYMBOLS.java;
    if (filePath.endsWith(".kt")) return LANGUAGE_SYMBOLS.kotlin;
    if (filePath.endsWith(".ts")) return LANGUAGE_SYMBOLS.ts;
    if (filePath.endsWith(".py")) return LANGUAGE_SYMBOLS.python;
    if (filePath.endsWith(".go")) return LANGUAGE_SYMBOLS.go;
    if (filePath.endsWith(".rs")) return LANGUAGE_SYMBOLS.rust;
    if (filePath.endsWith(".proto")) return LANGUAGE_SYMBOLS.proto;
    if (filePath.endsWith(".toml")) return LANGUAGE_SYMBOLS.toml;
    throw new Error(`language not detected for filepath ${filePath}`);
}

// Enhanced CODE_BLOCK_REGEX to capture CODE_LOAD with options
const CODE_LOAD_REGEX = /```(\w+)([^\n]*)\{["']?CODE_LOAD::([^#?\}]+)(?:#([^?\}]*))?(?:\?([^\}]*))?\}([^\n]*)\n([\s\S]*?)```/g;

function parseOptions(optionsStr) {
    // optionsStr: collapse_prequel&remove_comments
    const opts = { collapsePrequel: false, removeComments: false };
    if (!optionsStr) return opts;
    const parts = optionsStr.split("&");
    for (const part of parts) {
        if (part.includes("collapse_prequel")) opts.collapsePrequel = true;
        if (part.includes("remove_comments")) opts.removeComments = true;
    }
    return opts;
}

function extractAndClean(fileContent, customTag, filePath, collapsePrequel, removeComments) {
    const { commentSymbol, serviceSymbol } = extractLanguageSymbol(filePath);
    let lines;
    
    // If custom tag is provided, use start/end tags
    if (customTag) {
        const startTag = `<start_${customTag}>`;
        const endTag = `<end_${customTag}>`;
        if (fileContent.includes(startTag) && fileContent.includes(endTag)) {
            lines = fileContent.split(startTag).pop().split(endTag).shift().split('\n').slice(1, -1)
                .filter(line => !line.includes(`${commentSymbol} break`));
        } else {
            lines = fileContent.split('\n').filter(line => !line.includes(`${commentSymbol} break`));
        }
    } else {
        // No custom tag, use entire file content
        lines = fileContent.split('\n').filter(line => !line.includes(`${commentSymbol} break`));
    }
    
    if (filePath.endsWith(".go")) {
        lines = lines.map(line => line.replace(/\t/g, '  '));
    }
    
    const leadingWhitespace = lines[0] ? lines[0].match(/^\s*/)[0] : '';
    let inBlockComment = false;
    let finalLines = lines.filter(line => {
        let trimmedLine = line.trim();
        if (removeComments) {
            if (trimmedLine.startsWith('/*')) inBlockComment = true;
            if (inBlockComment) {
                if (trimmedLine.endsWith('*/')) inBlockComment = false;
                return false;
            }
        }
        let keepLine = !line.includes('<start_') && !line.includes('<end_');
        if (removeComments) keepLine = keepLine && !trimmedLine.startsWith(commentSymbol);
        return keepLine;
    });

    if (collapsePrequel) {
        finalLines = collapsePrequelFn(finalLines, serviceSymbol, commentSymbol);
    }
    
    return finalLines.map(line => line.replace(new RegExp(`^${leadingWhitespace}`), '')).join('\n');
}

function collapsePrequelFn(lines, serviceSymbol, commentSymbol) {
    let collapseIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (serviceSymbol.some(symbol => lines[i].includes(symbol))) {
            collapseIndex = i;
            break;
        }
    }
    if (collapseIndex !== -1) {
        return lines.slice(collapseIndex);
    } else {
        throw new Error('No service/object/workflow found in file, so cannot collapse prequel');
    }
}

async function updateCodeBlocksInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const ext = path.extname(filePath);
    if (ext !== ".mdx") return;
    const fileContent = fs.readFileSync(filePath, "utf8");
    const updatedContent = await fileContent.replace(
        CODE_LOAD_REGEX,
        async (match, lang, metaBefore, loadPath, customTag, optionsStr, metaAfter, oldCode) => {
            const fullMeta = (metaBefore + (metaAfter || "")).trim();
            
            let loadedCode;
            if (loadPath.startsWith('https://raw.githubusercontent.com/')) {
                try {
                    const response = await fetch(loadPath);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch file from GitHub: ${response.status} ${response.statusText}`);
                    }
                    loadedCode = await response.text();
                } catch (e) {
                    console.warn(`❌ Error fetching from GitHub: ${loadPath}: ${e.message}`);
                    return match;
                }
            } else {
                const snippetFullPath = path.resolve(SNIPPET_DIR, loadPath);
                if (!fs.existsSync(snippetFullPath)) {
                    console.warn(`❌ Snippet not found: ${snippetFullPath}`);
                    return match;
                }
                loadedCode = fs.readFileSync(snippetFullPath, "utf8").trimEnd();
            }
            
            const opts = parseOptions(optionsStr);
            let codeToInsert;
            try {
                const snippetFullPath = loadPath.startsWith('https://raw.githubusercontent.com/') ? loadPath : path.resolve(SNIPPET_DIR, loadPath);
                codeToInsert = extractAndClean(
                    loadedCode,
                    customTag,
                    snippetFullPath,
                    opts.collapsePrequel,
                    opts.removeComments
                );
            } catch (e) {
                console.warn(`❌ Error processing snippet: ${loadPath}: ${e.message}`);
                return match;
            }
            return `\`\`\`${lang} ${fullMeta ? ' ' + fullMeta : ''} {"CODE_LOAD::${loadPath}${customTag ? '#' + customTag : ''}${optionsStr ? '?' + optionsStr : ''}"}\n${codeToInsert.trimEnd()}\n\`\`\``;

        }
    );
    fs.writeFileSync(filePath, updatedContent, "utf8");
    console.log(`✅ Updated: ${filePath}`);
}



async function updateCodeBlocksInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const ext = path.extname(filePath);
    if (ext !== ".mdx") return;
    const fileContent = fs.readFileSync(filePath, "utf8");
    
    // Find all matches first
    const matches = [...fileContent.matchAll(CODE_LOAD_REGEX)];
    
    // Process each match asynchronously
    let updatedContent = fileContent;
    for (const match of matches) {
        const [fullMatch, lang, metaBefore, loadPathRaw, customTagRaw, optionsStrRaw, metaAfter, oldCode] = match;
        const fullMeta = (metaBefore + (metaAfter || "")).trim();
        const loadPath = loadPathRaw ? loadPathRaw.replace(/"/g, '') : undefined;
        const customTag = customTagRaw ? customTagRaw.replace(/"/g, '') : undefined;
        const optionsStr = optionsStrRaw ? optionsStrRaw.replace(/"/g, '') : undefined;

        
        let loadedCode;
        if (loadPath.startsWith('https://raw.githubusercontent.com/')) {
            try {
                const response = await fetch(loadPath);
                if (!response.ok) {
                    throw new Error(`Failed to fetch file from GitHub: ${response.status} ${response.statusText}`);
                }
                loadedCode = await response.text();
            } catch (e) {
                console.warn(`❌ Error fetching from GitHub: ${loadPath}: ${e.message}`);
                continue;
            }
        } else {
            const snippetFullPath = path.resolve(SNIPPET_DIR, loadPath);
            if (!fs.existsSync(snippetFullPath)) {
                console.warn(`❌ Snippet not found: ${snippetFullPath}`);
                continue;
            }
            loadedCode = fs.readFileSync(snippetFullPath, "utf8").trimEnd();
        }
        
        const opts = parseOptions(optionsStr);
        let codeToInsert;
        try {
            const snippetFullPath = loadPath.startsWith('https://raw.githubusercontent.com/') ? loadPath : path.resolve(SNIPPET_DIR, loadPath);
            codeToInsert = extractAndClean(
                loadedCode,
                customTag,
                snippetFullPath,
                opts.collapsePrequel,
                opts.removeComments
            );
        } catch (e) {
            console.warn(`❌ Error processing snippet: ${loadPath}: ${e.message}`);
            continue;
        }
        
        const replacement = `\`\`\`${lang}${fullMeta ? ' ' + fullMeta : ''} {"CODE_LOAD::${loadPath}${customTag ? '#' + customTag : ''}${optionsStr ? '?' + optionsStr : ''}"} \n${codeToInsert.trimEnd()}\n\`\`\``;
        updatedContent = updatedContent.replace(fullMatch, replacement);
    }
    
    fs.writeFileSync(filePath, updatedContent, "utf8");
    console.log(`✅ Updated: ${filePath}`);
}

function updateAllMdxFiles(directory = MDX_DIR) {
    fs.readdirSync(directory, {withFileTypes: true}).forEach((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            updateAllMdxFiles(fullPath); // Recursively process subdirectories
        } else if (entry.isFile() && fullPath.endsWith(".mdx")) {
            updateCodeBlocksInFile(fullPath);
        }
    });
}

function startWatcher() {
    console.log("👀 Watching for changes...");

    chokidar
        .watch([MDX_DIR, SNIPPET_DIR], {
            ignoreInitial: false,
            persistent: true,
        })
        .on("change", (filePath) => {
            console.log(`✏️ File changed: ${filePath}`);

            if (filePath.endsWith(".mdx")) {
                // Check if it's a guide file (but not the overview itself)
                if (filePath.includes("/guides/") && !filePath.endsWith("/overview.mdx")) {
                    console.log("🔄 Guide file changed, regenerating overview...");
                    generateGuidesOverview();
                }
                // updateCodeBlocksInFile(filePath);
            } else {
                console.log("🔁 Updating all .mdx files (snippet changed)...");
                updateAllMdxFiles();
            }
        })
        .on("add", (filePath) => {
            if (filePath.endsWith(".mdx") && filePath.includes("/guides/") && !filePath.endsWith("/overview.mdx")) {
                console.log(`📄 New guide file added: ${filePath}`);
                console.log("🔄 Regenerating overview...");
                generateGuidesOverview();
            }
        })
        .on("unlink", (filePath) => {
            if (filePath.endsWith(".mdx") && filePath.includes("/guides/") && !filePath.endsWith("/overview.mdx")) {
                console.log(`🗑️ Guide file removed: ${filePath}`);
                console.log("🔄 Regenerating overview...");
                generateGuidesOverview();
            }
        });
}

// Generate guides overview on startup
console.log("🏗️ Generating guides overview on startup...");
generateGuidesOverview();

updateAllMdxFiles();
// startWatcher();
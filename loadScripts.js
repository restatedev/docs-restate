const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

const MDX_DIR = path.resolve("./docs"); // Folder with your .mdx files
const SNIPPET_DIR = path.resolve("./snippets"); // Folder with code to load

const CODE_BLOCK_REGEX =
  /```(\w+)([^\n]*)\{CODE_LOAD::(.+?)\}([^\n]*)\n([\s\S]*?)```/g;

function updateCodeBlocksInFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const ext = path.extname(filePath);
  if (ext !== ".mdx") return;

  const fileContent = fs.readFileSync(filePath, "utf8");

  const updatedContent = fileContent.replace(
    CODE_BLOCK_REGEX,
    (match, lang, metaBefore, loadPath, metaAfter) => {
      const fullMeta = (metaBefore + metaAfter).trim();
      const snippetFullPath = path.resolve(path.dirname(filePath), loadPath);

      if (!fs.existsSync(snippetFullPath)) {
        console.warn(`❌ Snippet not found: ${snippetFullPath}`);
        return match;
      }

      const loadedCode = fs.readFileSync(snippetFullPath, "utf8").trimEnd();
      return `\`\`\`${lang} ${fullMeta} {CODE_LOAD::${loadPath}}\n${loadedCode}\n\`\`\``;
    }
  );

  fs.writeFileSync(filePath, updatedContent, "utf8");
  console.log(`✅ Updated: ${filePath}`);
}

function updateAllMdxFiles() {
  fs.readdirSync(MDX_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .forEach((file) => {
      updateCodeBlocksInFile(path.join(MDX_DIR, file));
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
        updateCodeBlocksInFile(filePath);
      } else {
        console.log("🔁 Updating all .mdx files (snippet changed)...");
        updateAllMdxFiles();
      }
    });
}

updateAllMdxFiles();
startWatcher();

const fs = require("fs");
const path = require("path");

const CHANGELOG_DIR = path.resolve("./docs/changelog");
const LEGACY_FILES = [
    path.resolve("./docs/changelog.mdx"),
    path.resolve("./docs/changelog/index.mdx"),
];
const CACHE_FILE = path.resolve("./scripts/.changelog-cache.json");

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const INCLUDE_PRERELEASES = false;

// Each repo writes its releases into the page identified by `page`. Repos
// that share a `page` get merged onto the same MDX file — e.g. the
// vercel-ai-middleware package lives on the TypeScript SDK changelog because
// it's a TypeScript library. `tag` is the label shown next to each release's
// version in that page's entry list.
const REPOS = [
    { repo: "restate",              tag: "Restate Server",       page: "server" },
    { repo: "sdk-typescript",       tag: "TypeScript SDK",       page: "typescript-sdk" },
    { repo: "vercel-ai-middleware", tag: "Vercel AI Middleware", page: "typescript-sdk" },
    { repo: "sdk-python",           tag: "Python SDK",           page: "python-sdk" },
    { repo: "sdk-java",             tag: "Java/Kotlin SDK",      page: "java-kotlin-sdk" },
    { repo: "sdk-go",               tag: "Go SDK",               page: "go-sdk" },
    { repo: "sdk-rust",             tag: "Rust SDK",             page: "rust-sdk" },
    { repo: "restate-operator",     tag: "Kubernetes Operator",  page: "operator" },
];

function getTtlSeconds() {
    const raw = process.env.CHANGELOG_CACHE_TTL_SECONDS;
    if (raw === undefined) return DEFAULT_TTL_SECONDS;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TTL_SECONDS;
}

function readCache() {
    if (!fs.existsSync(CACHE_FILE)) return { repos: {} };
    try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    } catch (e) {
        console.warn(`⚠️ Could not parse changelog cache, ignoring: ${e.message}`);
        return { repos: {} };
    }
}

function writeCache(cache) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

async function fetchReleasesForRepo(repo) {
    const headers = {
        Accept: "application/vnd.github+json",
        "User-Agent": "restate-docs-changelog",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const all = [];
    let page = 1;
    // Safety cap: 20 pages * 100 = 2000 releases per repo; plenty of room.
    while (page <= 20) {
        const url = `https://api.github.com/repos/restatedev/${repo}/releases?per_page=100&page=${page}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`GitHub API ${res.status} ${res.statusText} for ${url}`);
        }
        const batch = await res.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 100) break;
        page += 1;
    }

    return all
        .filter((r) => !r.draft && (INCLUDE_PRERELEASES || !r.prerelease))
        .map((r) => ({
            tag_name: r.tag_name,
            name: r.name,
            published_at: r.published_at,
            body: r.body || "",
            html_url: r.html_url,
        }));
}

async function getReleasesForRepo(repo, cache, ttlSeconds) {
    const entry = cache.repos[repo];
    const now = Date.now();
    if (
        entry &&
        typeof entry.fetchedAt === "number" &&
        ttlSeconds > 0 &&
        now - entry.fetchedAt < ttlSeconds * 1000
    ) {
        console.log(`   📦 ${repo}: using cached releases (${entry.releases.length})`);
        return entry.releases;
    }
    try {
        console.log(`   🌐 ${repo}: fetching from GitHub...`);
        const releases = await fetchReleasesForRepo(repo);
        cache.repos[repo] = { fetchedAt: now, releases };
        console.log(`   ✅ ${repo}: ${releases.length} releases`);
        return releases;
    } catch (e) {
        if (entry && entry.releases) {
            console.warn(
                `   ⚠️ ${repo}: fetch failed (${e.message}); falling back to cached ${entry.releases.length} releases`
            );
            return entry.releases;
        }
        console.warn(`   ❌ ${repo}: fetch failed (${e.message}); no cache available, skipping`);
        return [];
    }
}

/**
 * Make a GitHub release body safe for MDX:
 * - Escape lone `{` / `}` (outside fenced code blocks) so MDX doesn't treat them as JSX expressions.
 * - Demote `#` and `##` headings to `###` so they don't clash with the page heading hierarchy.
 * - Strip trailing "Full Changelog: ..." lines (we add our own "View on GitHub" link).
 * - Neutralize bare `<Foo>`-style tags that aren't real MDX components.
 */
function sanitizeBody(body) {
    if (!body || !body.trim()) return "_No release notes provided._";

    const lines = body.replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let inFence = false;
    let fenceMarker = "";

    for (let rawLine of lines) {
        const trimmed = rawLine.trim();

        // Detect fenced code block boundaries (``` or ~~~).
        const fenceMatch = trimmed.match(/^(```+|~~~+)/);
        if (fenceMatch) {
            if (!inFence) {
                inFence = true;
                fenceMarker = fenceMatch[1].slice(0, 3);
            } else if (trimmed.startsWith(fenceMarker)) {
                inFence = false;
                fenceMarker = "";
            }
            out.push(rawLine);
            continue;
        }

        if (inFence) {
            out.push(rawLine);
            continue;
        }

        // Drop auto-generated "Full Changelog: ..." trailer lines.
        if (/^\s*\**\s*full changelog\s*\**\s*:/i.test(rawLine)) {
            continue;
        }

        let line = rawLine;

        // Demote h1/h2 → h3 (leave h3+ alone).
        line = line.replace(/^(\s*)(#{1,2})\s+/, (_, lead) => `${lead}### `);

        // Escape curly braces so MDX doesn't parse them as expressions.
        line = line.replace(/([{}])/g, (m) => (m === "{" ? "&#123;" : "&#125;"));

        // Neutralize opening tags that look like JSX components but aren't
        // known Markdown/HTML tags. Keeps inline HTML that MDX actually supports
        // (a, code, em, strong, img, br, hr, p, ul, ol, li, details, summary,
        // table/thead/tbody/tr/td/th, blockquote, div, span, sub, sup, kbd).
        const ALLOWED_HTML = new Set([
            "a", "abbr", "address", "article", "aside", "b", "bdi", "bdo",
            "blockquote", "br", "caption", "cite", "code", "col", "colgroup",
            "dd", "del", "details", "dfn", "div", "dl", "dt", "em", "figcaption",
            "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header",
            "hr", "i", "img", "ins", "kbd", "li", "main", "mark", "nav", "ol",
            "p", "pre", "q", "s", "samp", "section", "small", "span", "strong",
            "sub", "summary", "sup", "table", "tbody", "td", "tfoot", "th",
            "thead", "time", "tr", "u", "ul", "var", "video", "audio", "source",
        ]);
        line = line.replace(/<(\/?)([A-Za-z][A-Za-z0-9-]*)(\s[^>]*)?>/g, (match, slash, name, attrs) => {
            if (ALLOWED_HTML.has(name.toLowerCase())) return match;
            // Escape so MDX treats it as literal text.
            return `&lt;${slash}${name}${attrs || ""}&gt;`;
        });

        // Escape any remaining bare `<` that isn't the start of a valid tag,
        // closing tag, HTML comment, or processing instruction. Catches
        // version comparisons like "< 2.0" / "<= 1.4" and arrow notation
        // like "<->", which MDX would otherwise try to parse as JSX.
        line = line.replace(/<(?![A-Za-z/!?])/g, "&lt;");

        out.push(line);
    }

    // Trim blank lines off top and bottom.
    while (out.length && out[0].trim() === "") out.shift();
    while (out.length && out[out.length - 1].trim() === "") out.pop();

    return out.length ? out.join("\n") : "_No release notes provided._";
}

function formatDateLabel(iso) {
    if (!iso) return "Unknown date";
    const d = new Date(iso);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function renderUpdate(entry) {
    const label = formatDateLabel(entry.publishedAt);
    const version = entry.tagName || entry.name || "";
    const description = version ? `${entry.productTag} ${version}` : entry.productTag;
    const body = sanitizeBody(entry.body);
    return `<Update label="${label}" description=${JSON.stringify(description)}>
${body}

[View on GitHub](${entry.htmlUrl})
</Update>`;
}

function renderPage({ title, description, sidebarTitle, entries }) {
    const frontmatterLines = [
        `title: ${JSON.stringify(title)}`,
        `description: ${JSON.stringify(description)}`,
    ];
    if (sidebarTitle) frontmatterLines.push(`sidebarTitle: ${JSON.stringify(sidebarTitle)}`);
    frontmatterLines.push(`rss: true`);

    const header = `---
${frontmatterLines.join("\n")}
---

{/* GENERATED by scripts/generate-changelog.js — do not edit by hand. */}

`;

    if (entries.length === 0) {
        return `${header}No releases yet.\n`;
    }

    return header + entries.map(renderUpdate).join("\n\n") + "\n";
}

async function generateChangelog() {
    console.log("📰 Generating changelog...");
    const ttlSeconds = getTtlSeconds();
    const cache = readCache();

    const entries = [];
    for (const { repo, tag, page } of REPOS) {
        const releases = await getReleasesForRepo(repo, cache, ttlSeconds);
        for (const r of releases) {
            entries.push({
                productTag: tag,
                page,
                repo,
                tagName: r.tag_name,
                name: r.name,
                publishedAt: r.published_at,
                body: r.body,
                htmlUrl: r.html_url,
            });
        }
    }

    writeCache(cache);

    entries.sort((a, b) => {
        const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return db - da;
    });

    fs.mkdirSync(CHANGELOG_DIR, { recursive: true });

    // Remove any legacy unified-page files left over from earlier layouts so
    // /changelog always routes to the per-product pages below.
    for (const legacy of LEGACY_FILES) {
        if (fs.existsSync(legacy)) {
            fs.unlinkSync(legacy);
            console.log(`🗑️  Removed legacy ${legacy}`);
        }
    }

    // Build the list of pages by grouping REPOS entries on `page`. The first
    // repo for a given page supplies the page title and sidebar label.
    const pages = [];
    const seen = new Map();
    for (const { tag, page } of REPOS) {
        if (seen.has(page)) continue;
        seen.set(page, true);
        pages.push({ slug: page, title: tag });
    }

    for (const { slug, title } of pages) {
        const productEntries = entries.filter((e) => e.page === slug);
        const file = path.join(CHANGELOG_DIR, `${slug}.mdx`);
        const content = renderPage({
            title: `${title} changelog`,
            description: `Releases of the ${title}.`,
            sidebarTitle: title,
            entries: productEntries,
        });
        fs.writeFileSync(file, content, "utf8");
        console.log(`   ↳ ${productEntries.length} entries → ${file}`);
    }
}

module.exports = { generateChangelog };

if (require.main === module) {
    generateChangelog().catch((e) => {
        console.error("❌ Error generating changelog:", e);
        process.exit(1);
    });
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```
This command runs both the code loading watcher and the Mintlify docs server concurrently.

**Manual code block updates:**
```bash
node scripts/loadScripts.js
```
Updates all code blocks in MDX files with content from snippets directory.

## Architecture Overview

This is a **Mintlify documentation site** for Restate, a platform for building resilient applications. The repository structure follows a docs-as-code approach with dynamic code loading.

### Key Components

**Documentation Structure:**
- `/docs/` - Main documentation files (MDX format)
- `/snippets/` - Code examples in multiple languages (TypeScript, Java, Kotlin, Python, Go, Rust)
- `docs.json` - Mintlify configuration defining navigation and site structure

**Dynamic Code Loading System:**
- `loadScripts.js` - Watches for changes and injects code from snippets into MDX files
- Uses special syntax: `{CODE_LOAD::path/to/file#tag?options}` within code blocks
- Supports multiple languages with language-specific processing
- Features: code filtering, comment removal, section extraction, prequel collapsing

**Multi-Language SDK Documentation:**
The docs cover multiple Restate SDKs:
- TypeScript (primary with most complete docs)
- Java/Kotlin
- Python
- Go
- Rust

### Content Organization

**Primary documentation paths:**
- `get-started/` - Onboarding content
- `develop/` - SDK-specific development guides
- `deploy/` - Platform deployment instructions
- `operate/` - Server management and operations
- `guides/` - Use case patterns and recipes
- `references/` - Technical references and API docs

**Code snippets structure:**
- Organized by language: `/snippets/{language}/`
- Covers common patterns: services, workflows, state management, error handling
- Uses tagged sections for precise code extraction

### Development Workflow

1. Edit MDX files in `/docs/` for documentation content
2. Update code examples in `/snippets/{language}/` directories
3. Code is automatically injected into MDX files via the loading system
4. Use `npm run dev` to run live development server with file watching

### Special Features

**CODE_LOAD System:**
- Extracts specific code sections using `<start_tag>` and `<end_tag>` markers
- Supports filtering with options like `collapse_prequel` and `remove_comments`
- Handles both local files and GitHub raw URLs
- Language-aware processing with different comment symbols and service detection

**Navigation:**
Configured via `docs.json` with tabbed navigation (Learn, Build, Guides) and nested groupings for different SDK languages.

# Mintlify documentation

## Working relationship
- You can push back on ideas-this can lead to better documentation. Cite sources and explain your reasoning when you do so
- ALWAYS ask for clarification rather than making assumptions
- NEVER lie, guess, or make up information

## Project context
- Format: MDX files with YAML frontmatter
- Config: docs.json for navigation, theme, settings
- Components: Mintlify components

## Content strategy
- Document just enough for user success - not too much, not too little
- Prioritize accuracy and usability of information
- Make content evergreen when possible
- Search for existing information before adding new content. Avoid duplication unless it is done for a strategic reason
- Check existing patterns for consistency
- Start by making the smallest reasonable changes

## docs.json

- Refer to the [docs.json schema](https://mintlify.com/docs.json) when building the docs.json file and site navigation

## Frontmatter requirements for pages
- title: Clear, descriptive page title
- description: Concise summary for SEO/navigation

## Writing standards
- Second-person voice ("you")
- Prerequisites at start of procedural content
- Test all code examples before publishing
- Match style and formatting of existing pages
- Include both basic and advanced use cases
- Language tags on all code blocks
- Alt text on all images
- Relative paths for internal links
- Don't use dashes

## Do not
- Skip frontmatter on any MDX file
- Use absolute URLs for internal links
- Include untested code examples
- Make assumptions - always ask for clarification
/**
 * Shared utility: walks the monorepo and returns file contents as a single
 * context string that can be embedded in an agent prompt.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// Directories / files to always skip
const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build',
  '.turbo', '.pnpm', 'reports', 'scripts',
  'prisma/migrations', // generated — not useful for review
]);

const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.lock',        // pnpm-lock.yaml
  '.map',         // source maps
]);

const SKIP_FILES = new Set([
  'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock',
  '.DS_Store', 'Thumbs.db',
]);

/**
 * Walk `dir` recursively and collect {path, content} for every text file.
 * @param {string}   dir
 * @param {string[]} [include]  if set, only collect files whose relative path
 *                              contains one of these substrings
 * @param {number}   [maxKB=60] skip files larger than this
 */
function collectFiles(dir = ROOT, include = null, maxKB = 60) {
  const results = [];

  function walk(current) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const rel      = path.relative(ROOT, fullPath);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        // Skip hidden dirs except .env files
        if (entry.name.startsWith('.') && entry.name !== '.env') continue;
        walk(fullPath);
        continue;
      }

      // File checks
      if (SKIP_FILES.has(entry.name))                     continue;
      if (SKIP_EXTENSIONS.has(path.extname(entry.name))) continue;
      if (entry.name.startsWith('.env'))                  continue; // never read secrets

      // Size guard
      try {
        const { size } = fs.statSync(fullPath);
        if (size > maxKB * 1024) continue;
      } catch { continue; }

      // Optional include filter
      if (include && !include.some(s => rel.includes(s))) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        results.push({ path: rel, content });
      } catch { /* unreadable — skip */ }
    }
  }

  walk(dir);
  return results;
}

/**
 * Format collected files into a single context block.
 */
function formatContext(files) {
  return files
    .map(f => `\n### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n');
}

/**
 * Save a report to /reports with a timestamp prefix.
 * Returns the full path written.
 */
function saveReport(name, content) {
  const reportsDir = path.join(ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${ts}_${name}.md`;
  const fullPath = path.join(reportsDir, filename);

  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

module.exports = { collectFiles, formatContext, saveReport, ROOT };

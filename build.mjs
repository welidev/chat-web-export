// Builds docs/export.min.js: the paste-ready one-liner the website shows. GitHub Pages serves docs/ as is,
// so run `npm run build` and commit the result whenever export.js changes.
// The two config vars stay readable on the first line so the site (and people) can edit them.
import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const src = readFileSync(new URL('./export.js', import.meta.url), 'utf8');
const start = src.indexOf('(async () => {');
if (start < 0) throw new Error('export.js: could not find the async IIFE');
const config = [...src.slice(0, start).matchAll(/^var (\w+) = ([^;]+);/gm)].map(([, k, v]) => `${k}=${v}`);
if (config.length !== 2) throw new Error('export.js: expected two config vars before the IIFE');

let { code } = transformSync(src.slice(start), { minify: true, target: 'es2022', charset: 'utf8' });
// Minified output keeps real newlines only inside template literals; escaping them makes it one line.
code = code.trim().replace(/\n/g, '\\n');
if (code.includes('\n')) throw new Error('newline survived minification');

const notice = '/* chat-web-export (github.com/welidev/chat-web-export): educational and personal-archival use only, on your own account. Not affiliated with WhatsApp LLC or Meta. No warranty. */';
const out = `${notice}var ${config.join(',')};${code}\n`;
writeFileSync(new URL('./docs/export.min.js', import.meta.url), out);
console.log(`docs/export.min.js: ${out.length} bytes`);

import { readFile, access } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('../', import.meta.url);
const htmlFiles = ['index.html', 'demo.html', 'privacy.html', 'terms.html', '404.html'];
const failures = [];

function fail(message) {
  failures.push(message);
}

async function exists(path) {
  try {
    await access(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

function routeToFile(route) {
  const clean = route.split(/[?#]/)[0];
  if (clean === '/') return 'index.html';
  if (clean === '/demo') return 'demo.html';
  if (clean === '/privacy') return 'privacy.html';
  if (clean === '/terms') return 'terms.html';
  return clean.replace(/^\//, '');
}

for (const file of htmlFiles) {
  const html = await readFile(new URL(file, root), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) fail(`${file}: duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`);

  for (const match of html.matchAll(/\bhref="([^"]+)"/g)) {
    const href = match[1];
    if (href === '#') fail(`${file}: placeholder href found`);
    if (href.startsWith('#') && !ids.includes(href.slice(1))) fail(`${file}: missing fragment target ${href}`);
    if (href.startsWith('/') && !href.startsWith('//')) {
      const target = routeToFile(href);
      if (extname(target) || ['/demo', '/privacy', '/terms', '/'].includes(href.split(/[?#]/)[0])) {
        if (!await exists(target)) fail(`${file}: missing local target ${href}`);
      }
    }
  }

  for (const match of html.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\balt="[^"]*"/.test(match[1])) fail(`${file}: image without alt attribute`);
  }

  if (/\bon(?:click|change|submit|load|error)=/i.test(html)) fail(`${file}: inline event handler found`);
  if (/G-XXXXXXXXXX|formspree|data-payment-placeholder|Replace this button/i.test(html)) fail(`${file}: placeholder integration text found`);
}

const index = await readFile(new URL('index.html', root), 'utf8');
const formMatch = index.match(/<form[^>]+name="early-access-leads"[\s\S]*?<\/form>/);
if (!formMatch) fail('index.html: Netlify early-access form missing');
else {
  const form = formMatch[0];
  for (const requirement of ['data-netlify="true"', 'netlify-honeypot="bot-field"', 'name="consent"', 'name="source"', 'name="plan"', 'name="submitted-at"']) {
    if (!form.includes(requirement)) fail(`index.html: form missing ${requirement}`);
  }
}

const netlify = await readFile(new URL('netlify.toml', root), 'utf8');
for (const header of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'X-Frame-Options']) {
  if (!netlify.includes(header)) fail(`netlify.toml: missing ${header}`);
}

const png = await readFile(new URL('og-image.png', root));
if (png.toString('ascii', 1, 4) !== 'PNG') fail('og-image.png: invalid PNG signature');
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== 1200 || height !== 630) fail(`og-image.png: expected 1200x630, received ${width}x${height}`);

for (const script of ['assets/site.js', 'assets/demo.js']) {
  const source = await readFile(new URL(script, root), 'utf8');
  try {
    new Function(source);
  } catch (error) {
    fail(`${script}: JavaScript syntax error: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`Validation failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML pages, local routes, form wiring, security headers, scripts, and the social image.`);

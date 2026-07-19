import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const requiredFiles = [
  'public/index.html',
  'public/styles.css',
  'public/app.js',
  'public/logo.svg',
];

for (const file of requiredFiles) {
  await access(file, constants.R_OK);
}

const [html, css, script, logo] = await Promise.all([
  readFile('public/index.html', 'utf8'),
  readFile('public/styles.css', 'utf8'),
  readFile('public/app.js', 'utf8'),
  readFile('public/logo.svg', 'utf8'),
]);

const failures = [];

for (const reference of ['/styles.css', '/app.js', '/logo.svg']) {
  if (!html.includes(reference)) failures.push(`index.html is missing ${reference}`);
}

for (const id of [
  'statusChip',
  'watchDemo',
  'ringStage',
  'miniStage',
  'randomize',
  'saveLook',
  'toast',
]) {
  if (!html.includes(`id="${id}"`)) failures.push(`index.html is missing #${id}`);
  if (!script.includes(`#${id}`)) failures.push(`app.js is missing #${id} binding`);
}

if (!html.includes('prefers-reduced-motion') && !css.includes('prefers-reduced-motion')) {
  failures.push('reduced-motion support is missing');
}

if (!html.includes('Not affiliated with FIFA')) {
  failures.push('independent-project disclaimer is missing');
}

if (!script.includes("fetch('/health'")) failures.push('health interaction is missing');
if (!script.includes("fetch('/ready'")) failures.push('readiness interaction is missing');
if (!logo.startsWith('<svg')) failures.push('logo.svg is not a valid SVG document');

const placeholderPattern = /REPLACE_|example\.com|TODO|FIXME/;
for (const [name, content] of Object.entries({ html, css, script, logo })) {
  if (placeholderPattern.test(content)) failures.push(`${name} contains a launch placeholder`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Public experience integrity check passed.');
}

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const output = 'pages-dist';
const apiBase = (process.env.TONRINGS_API_BASE ?? '').trim().replace(/\/$/, '');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp('public', output, { recursive: true });
await mkdir(`${output}/collection`, { recursive: true });
await cp('generated/images', `${output}/collection/images`, { recursive: true });
await cp('generated/metadata', `${output}/collection/metadata`, { recursive: true });
await cp('generated/gallery.html', `${output}/collection/gallery.html`);
await cp('generated/report.json', `${output}/collection/report.json`);
await cp('generated/manifest.json', `${output}/collection/manifest.json`);

let html = await readFile(`${output}/index.html`, 'utf8');
html = html
  .replaceAll('href="/logo.svg"', 'href="./logo.svg"')
  .replaceAll('href="/styles.css"', 'href="./styles.css"')
  .replaceAll('src="/logo.svg"', 'src="./logo.svg"')
  .replaceAll('src="/app.js"', 'src="./app.js"')
  .replace(
    '<script src="./app.js" defer></script>',
    '<script src="./config.js"></script>\n  <script src="./app.js" defer></script>',
  )
  .replace(
    '<a href="#security">Trust</a>',
    '<a href="#security">Trust</a>\n      <a href="./collection/gallery.html">Collection</a>',
  )
  .replace(
    '<a class="button primary" href="#experience">Create a preview</a>',
    '<a class="button primary" href="./collection/gallery.html">Explore the collection</a>',
  );

await writeFile(`${output}/index.html`, html);
await writeFile(`${output}/404.html`, html);
await writeFile(`${output}/.nojekyll`, '');
await writeFile(
  `${output}/config.js`,
  `window.TONRINGS_CONFIG = Object.freeze(${JSON.stringify({
    apiBase,
    staticHosting: true,
    collectionPath: './collection/gallery.html',
  })});\n`,
);
await writeFile(
  `${output}/deployment.json`,
  JSON.stringify(
    {
      commit: process.env.GITHUB_SHA ?? 'local',
      apiConnected: apiBase.length > 0,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log(`GitHub Pages site built in ${output}.`);
console.log(apiBase ? `API configured: ${apiBase}` : 'Static showcase mode: no backend API configured.');

import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'www');
const requiredThree = path.join(root, 'node_modules', 'three');

try {
  await stat(requiredThree);
} catch {
  console.error('Three.js is not installed. Run `npm install` before `npm run build:web`.');
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of ['index.html', 'css', 'js', 'assets']) {
  await cp(path.join(root, entry), path.join(out, entry), { recursive: true });
}
await mkdir(path.join(out, 'vendor'), { recursive: true });
await cp(requiredThree, path.join(out, 'vendor', 'three'), { recursive: true });

const indexPath = path.join(out, 'index.html');
let html = await readFile(indexPath, 'utf8');
html = html.replace(
  '"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"',
  '"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/"'
);
html = html.replace(
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n<meta name="theme-color" content="#101820">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">'
);
await writeFile(indexPath, html);
console.log('Mobile web bundle prepared in ./www (Three.js bundled locally).');

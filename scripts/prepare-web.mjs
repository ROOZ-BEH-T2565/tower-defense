import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'www');
const requiredThree = path.join(root, 'node_modules', 'three');
const requiredCapacitorCore = path.join(root, 'node_modules', '@capacitor', 'core');

try {
  await stat(requiredThree);
  await stat(path.join(requiredCapacitorCore, 'dist', 'index.js'));
} catch {
  console.error('Required web dependencies are missing. Run `npm install` before `npm run build:web`.');
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of ['index.html', 'css', 'js', 'assets']) {
  await cp(path.join(root, entry), path.join(out, entry), { recursive: true });
}
await mkdir(path.join(out, 'vendor'), { recursive: true });
await cp(requiredThree, path.join(out, 'vendor', 'three'), { recursive: true });
// Capacitor's source imports are bare module specifiers. Copy its browser ESM
// package and expose it through the import map so Android WebView can resolve it.
await cp(requiredCapacitorCore, path.join(out, 'vendor', 'capacitor-core'), { recursive: true });

const indexPath = path.join(out, 'index.html');
let html = await readFile(indexPath, 'utf8');
// Rewrite the import map as JSON rather than relying on exact whitespace/order.
html = html.replace(/(<script\s+type=["']importmap["']\s*>)([\s\S]*?)(<\/script>)/i, (_match, open, body, close) => {
  const importMap = JSON.parse(body);
  importMap.imports = importMap.imports || {};
  importMap.imports['three'] = './vendor/three/build/three.module.js';
  importMap.imports['three/addons/'] = './vendor/three/examples/jsm/';
  importMap.imports['@capacitor/core'] = './vendor/capacitor-core/dist/index.js';
  return open + JSON.stringify(importMap) + close;
});
html = html.replace(
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n<meta name="theme-color" content="#101820">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">'
);
await writeFile(indexPath, html);
console.log('Mobile web bundle prepared in ./www (Three.js and Capacitor core available locally).');

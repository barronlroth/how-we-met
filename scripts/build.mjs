import { build } from 'esbuild';
import { cp, mkdir, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, 'florida'), { recursive: true });
for (const name of ['index.html', 'embed.html', 'styles.css', 'game.js', 'assets']) {
  await cp(resolve(root, name), resolve(out, name), { recursive: true });
}
for (const name of await readdir(root)) {
  if (name.endsWith('.mp3')) await cp(resolve(root, name), resolve(out, name));
}
for (const name of ['index.html', 'style.css']) {
  await cp(resolve(root, 'florida', name), resolve(out, 'florida', name));
}
await cp(resolve(root, 'florida/assets'), resolve(out, 'florida/assets'), { recursive: true });
await build({ entryPoints: [resolve(root, 'florida/main.js')], outfile: resolve(out, 'florida/game.js'), bundle: true, format: 'esm', target: 'es2022', minify: true, sourcemap: false, logLevel: 'info' });
const version = createHash('sha256').update(await readFile(resolve(out, 'florida/game.js'))).update(await readFile(resolve(out, 'florida/style.css'))).digest('hex').slice(0, 12);
const html = await readFile(resolve(out, 'florida/index.html'), 'utf8');
await writeFile(resolve(out, 'florida/index.html'), html.replace('./game.js', `./game.js?v=${version}`).replace('./style.css', `./style.css?v=${version}`));
console.log('Built Toronto and Florida into dist/');

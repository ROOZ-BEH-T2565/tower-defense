import { spawnSync } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('npm', ['run', 'cap:sync']);
const androidDir = path.join(root, 'android');
const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const result = spawnSync(wrapper, ['assembleDebug'], {
  cwd: androidDir, stdio: 'inherit', shell: process.platform === 'win32'
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const dist = path.join(root, 'dist');
await mkdir(dist, { recursive: true });
await copyFile(apk, path.join(dist, 'app-debug.apk'));
console.log('\\nAPK ready: dist/app-debug.apk');

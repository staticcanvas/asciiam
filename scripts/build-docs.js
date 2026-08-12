import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const hugoArguments = [
  '--source',
  'docs',
  '--destination',
  '../public/docs',
  '--cleanDestinationDir',
  '--minify',
];

const localBuild = spawnSync('hugo', hugoArguments, {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (!localBuild.error) {
  process.exit(localBuild.status ?? 1);
}

if (localBuild.error.code !== 'ENOENT') throw localBuild.error;

console.log('Hugo was not found on PATH; using ghcr.io/gohugoio/hugo:v0.164.0.');
const containerBuild = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${projectRoot}:/src`,
    'ghcr.io/gohugoio/hugo:v0.164.0',
    '--source',
    '/src/docs',
    '--destination',
    '/src/public/docs',
    '--cleanDestinationDir',
    '--minify',
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
  }
);

if (containerBuild.error?.code === 'ENOENT') {
  console.error('Documentation build requires Hugo Extended or Docker.');
  process.exit(1);
}
if (containerBuild.error) throw containerBuild.error;
process.exit(containerBuild.status ?? 1);

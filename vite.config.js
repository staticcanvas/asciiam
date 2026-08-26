import { defineConfig } from 'vite';
import copy from 'rollup-plugin-copy';
import { resolve } from 'node:path';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import terser from '@rollup/plugin-terser';

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const packageName = pkg.name.split('/').pop();
const packageDist = `dist/${packageName}`;
const bundleDist = `${packageDist}/dist`;

const banner = `/*! ${packageName} v${pkg.version} | ${pkg.homepage} | ${pkg.license} */`;

function stageWebUtilityAssets() {
  return {
    name: 'stage-web-utility-assets',
    closeBundle() {
      const destination = resolve('docs/static/webutil/libs');
      rmSync(destination, { recursive: true, force: true });
      mkdirSync(destination, { recursive: true });
      cpSync(resolve(bundleDist), destination, { recursive: true });
      const brandingDestination = resolve('docs/static/webutil/assets/branding');
      mkdirSync(brandingDestination, { recursive: true });
      cpSync(resolve('branding/asciiam-logo.svg'), resolve(brandingDestination, 'asciiam-logo.svg'));
      // Vendor the tooltip engine's browser ESM build + CSS, matching how asciiam's own
      // bundle is staged here rather than pulled from a CDN at runtime.
      const lumeDestination = resolve('docs/static/webutil/libs/lume');
      mkdirSync(lumeDestination, { recursive: true });
      const lumeModule = resolve('node_modules/@staticcanvas/lume');
      cpSync(resolve(lumeModule, 'dist/lume.mjs'), resolve(lumeDestination, 'lume.mjs'));
      cpSync(resolve(lumeModule, 'dist/lume.mjs.map'), resolve(lumeDestination, 'lume.mjs.map'));
      cpSync(resolve(lumeModule, 'src/lume.css'), resolve(lumeDestination, 'lume.css'));
    },
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: false,
    sourcemap: true,
    target: 'es2015',
    lib: {
      entry: resolve(`src/${packageName}.js`),
      name: 'asciiam',
      fileName: packageName,
    },
    minify: false,
    rollupOptions: {
      output: [
        {
          format: 'umd',
          name: 'asciiam',
          dir: bundleDist,
          entryFileNames: `${packageName}.js`,
          exports: 'default',
          plugins: [terser({ format: { comments: true, preamble: banner } })],
        },
        {
          format: 'umd',
          name: 'asciiam',
          dir: bundleDist,
          entryFileNames: `${packageName}.min.js`,
          exports: 'default',
          plugins: [terser({ format: { comments: /^!/ }, compress: true, mangle: true })],
        },
        {
          format: 'umd',
          name: 'asciiam',
          dir: bundleDist,
          entryFileNames: `${packageName}.cjs`,
          exports: 'default',
          plugins: [terser({ format: { comments: true, preamble: banner } })],
        },
        {
          format: 'es',
          dir: bundleDist,
          entryFileNames: `${packageName}.mjs`,
          plugins: [terser({ format: { comments: true, preamble: banner } })],
        },
        {
          format: 'es',
          dir: bundleDist,
          entryFileNames: `${packageName}.esm.js`,
          plugins: [terser({ format: { comments: true, preamble: banner } })],
        },
        {
          format: 'es',
          dir: bundleDist,
          entryFileNames: `${packageName}.esm.min.js`,
          plugins: [terser({ format: { comments: /^!/ }, compress: true, mangle: true })],
        },
      ],
    },
  },
  plugins: [
    copy({
      targets: [
        { src: 'README.md', dest: packageDist },
        {
          src: 'package.json',
          dest: packageDist,
          transform: (contents) => {
            const packageJson = JSON.parse(contents.toString());
            delete packageJson.scripts;
            delete packageJson.devDependencies;
            delete packageJson.files;
            return JSON.stringify(packageJson, null, 2);
          },
        },
        { src: 'src', dest: packageDist },
        { src: 'branding', dest: packageDist },
        { src: 'LICENSE', dest: packageDist },
        { src: 'jsr.jsonc', dest: packageDist },
      ],
      hook: 'writeBundle',
    }),
    stageWebUtilityAssets(),
  ],
});

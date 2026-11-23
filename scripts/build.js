/**
 * Production Build & Cache-Busting Script
 * Generates hashed static assets (similar to Vite / Vue.js) in dist/
 * and updates index.html and sw.js with exact content hashes.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function getHash(buffer, length = 8) {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, length);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('🚀 Starting Persian Calendar production build with asset hashing...\n');

  // 1. Clean and prepare dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, 'js'), { recursive: true });

  // 2. Copy static root files and directories
  const staticFiles = [
    '.nojekyll',
    'CNAME',
    'assetlinks.json',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'offline.html',
  ];

  staticFiles.forEach((file) => {
    const srcPath = path.join(ROOT_DIR, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(DIST_DIR, file));
    }
  });

  // Copy .well-known if present
  if (fs.existsSync(path.join(ROOT_DIR, '.well-known'))) {
    copyRecursiveSync(path.join(ROOT_DIR, '.well-known'), path.join(DIST_DIR, '.well-known'));
  }

  // Copy assets/fonts and assets/icons
  copyRecursiveSync(path.join(ROOT_DIR, 'assets', 'fonts'), path.join(DIST_DIR, 'assets', 'fonts'));
  copyRecursiveSync(path.join(ROOT_DIR, 'assets', 'icons'), path.join(DIST_DIR, 'assets', 'icons'));

  // 3. Hash and write CSS files
  const cssFiles = [
    'assets/styles.css',
    'assets/desktop-calendar-layout.css',
  ];

  const hashMap = {};
  const allHashes = [];

  cssFiles.forEach((relPath) => {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath);
      const hash = getHash(content);
      allHashes.push(hash);

      const parsed = path.parse(relPath);
      const hashedName = `${parsed.name}.${hash}${parsed.ext}`;
      const destRelPath = path.join(parsed.dir, hashedName).replace(/\\/g, '/');

      fs.writeFileSync(path.join(DIST_DIR, destRelPath), content);
      hashMap[relPath] = destRelPath;
      hashMap[`/${relPath}`] = `/${destRelPath}`;

      console.log(`  📦 CSS: ${relPath} -> ${destRelPath}`);
    }
  });

  // 4. Hash and write JS files
  const jsFiles = [
    'js/jalali.js',
    'js/hijri.js',
    'js/events-service.js',
    'js/notes-service.js',
    'js/prayer-times.js',
    'js/age-calculator.js',
    'js/theme.js',
    'js/app.js',
  ];

  jsFiles.forEach((relPath) => {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath);
      const hash = getHash(content);
      allHashes.push(hash);

      const parsed = path.parse(relPath);
      const hashedName = `${parsed.name}.${hash}${parsed.ext}`;
      const destRelPath = path.join(parsed.dir, hashedName).replace(/\\/g, '/');

      fs.writeFileSync(path.join(DIST_DIR, destRelPath), content);
      hashMap[relPath] = destRelPath;
      hashMap[`/${relPath}`] = `/${destRelPath}`;

      console.log(`  ⚡ JS:  ${relPath} -> ${destRelPath}`);
    }
  });

  // Combined build hash
  const buildHash = crypto.createHash('sha256').update(allHashes.join('')).digest('hex').slice(0, 8);
  console.log(`\n  🔑 Build Hash: ${buildHash}`);

  // 5. Transform index.html -> dist/index.html
  let html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Replace each mapped file in HTML (with or without existing query strings)
  for (const [original, hashed] of Object.entries(hashMap)) {
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(["'])${escaped}(?:\\?[^"']*)?\\1`, 'g');
    html = html.replace(regex, `$1${hashed}$1`);
  }

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html, 'utf8');
  console.log('  📄 HTML: Updated index.html with hashed references');

  // 6. Transform sw.js -> dist/sw.js
  let sw = fs.readFileSync(path.join(ROOT_DIR, 'sw.js'), 'utf8');

  // Update CACHE_NAME
  const newCacheName = `persian-date-v${buildHash}`;
  sw = sw.replace(/const CACHE_NAME\s*=\s*["'][^"']+["'];/, `const CACHE_NAME = "${newCacheName}";`);

  // Build new PRECACHE_URLS list
  const fontFiles = [
    '/assets/fonts/Vazirmatn-font-face.css',
    '/assets/fonts/webfonts/Vazirmatn-Black.woff2',
    '/assets/fonts/webfonts/Vazirmatn-Bold.woff2',
    '/assets/fonts/webfonts/Vazirmatn-ExtraBold.woff2',
    '/assets/fonts/webfonts/Vazirmatn-ExtraLight.woff2',
    '/assets/fonts/webfonts/Vazirmatn-Light.woff2',
    '/assets/fonts/webfonts/Vazirmatn-Medium.woff2',
    '/assets/fonts/webfonts/Vazirmatn-Regular.woff2',
    '/assets/fonts/webfonts/Vazirmatn-SemiBold.woff2',
    '/assets/fonts/webfonts/Vazirmatn-Thin.woff2',
    '/assets/fonts/webfonts/Vazirmatn[wght].woff2',
  ];

  const precacheUrls = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html',
    ...fontFiles,
    ...Object.values(hashMap)
      .filter((p) => p.startsWith('/'))
      .sort(),
  ];

  const precacheStr = 'const PRECACHE_URLS = [\n' + precacheUrls.map((u) => `  "${u}",`).join('\n') + '\n];';
  sw = sw.replace(/const PRECACHE_URLS\s*=\s*\[[\s\S]*?\];/, precacheStr);

  fs.writeFileSync(path.join(DIST_DIR, 'sw.js'), sw, 'utf8');
  console.log(`  🛡️  SW:   Updated sw.js with cache "${newCacheName}" and ${precacheUrls.length} precached assets\n`);

  console.log('✅ Build complete! Files generated in dist/ directory.');
}

build();

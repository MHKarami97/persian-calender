/**
 * Syntax & Module Verification Test
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dirs = ['js', 'scripts'];
let errors = 0;

dirs.forEach((dir) => {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) return;

  fs.readdirSync(fullDir)
    .filter((f) => f.endsWith('.js'))
    .forEach((file) => {
      const filePath = path.join(fullDir, file);
      try {
        execSync(`node -c "${filePath}"`);
        console.log(`  ✓ Syntax OK: ${path.join(dir, file)}`);
      } catch (e) {
        console.error(`  ✗ Syntax Error: ${path.join(dir, file)}`);
        errors += 1;
      }
    });
});

// Also test sw.js
try {
  execSync(`node -c "${path.join(root, 'sw.js')}"`);
  console.log(`  ✓ Syntax OK: sw.js`);
} catch (e) {
  errors += 1;
}

if (errors > 0) {
  console.error(`\nTests failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log('\nAll syntax tests passed successfully!');
}

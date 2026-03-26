/**
 * Watch script for browser extensions
 * Automatically rebuilds when source files change
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const browser = process.argv[2];

if (!browser || !['chrome', 'firefox', 'safari'].includes(browser)) {
  console.error('Usage: node watch.js <chrome|firefox|safari>');
  process.exit(1);
}

const srcDir = path.join(__dirname, '..', 'src');

console.log(`👀 Watching src/ directory for changes...`);
console.log(`🎯 Target browser: ${browser}\n`);

// Initial build
rebuild();

// Watch for changes
fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
  if (filename && filename.endsWith('.js') || filename.endsWith('.html') || filename.endsWith('.css')) {
    console.log(`\n📝 Detected change in ${filename}`);
    rebuild();
  }
});

function rebuild() {
  try {
    execSync(`node ${path.join(__dirname, 'build.js')} ${browser}`, {
      stdio: 'inherit'
    });
    console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Ready for changes...`);
  } catch (error) {
    console.error('Build failed:', error.message);
  }
}

/**
 * Build script for browser extensions
 * Copies shared source files to browser-specific directories
 */

const fs = require('fs');
const path = require('path');

const browser = process.argv[2];

if (!browser || !['chrome', 'firefox', 'safari'].includes(browser)) {
  console.error('Usage: node build.js <chrome|firefox|safari>');
  process.exit(1);
}

const srcDir = path.join(__dirname, '..', 'src');
const targetDir = path.join(__dirname, '..', browser);

// Files to copy
const filesToCopy = [
  'background.js',
  'content.js',
  'icon-utils.js',
  'inject.js',
  'protocols.js',
  'modal.js',
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
  'style.css'
];

// Directories to copy recursively
const dirsToCopy = [
  'protocols'
];

const manifestsDir = path.join(__dirname, '..', 'manifests');

console.log(`Building ${browser} extension...`);

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy browser-specific manifest
const manifestSrc = path.join(manifestsDir, `${browser}-manifest.json`);
const manifestDest = path.join(targetDir, 'manifest.json');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log(`✓ Copied manifest.json`);
} else {
  console.warn(`⚠ Warning: ${browser}-manifest.json not found in manifests/`);
}

// Copy files
filesToCopy.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const targetPath = path.join(targetDir, file);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, targetPath);
    console.log(`✓ Copied ${file}`);
  } else {
    console.warn(`⚠ Warning: ${file} not found in src/`);
  }
});

// Copy directories recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

dirsToCopy.forEach(dir => {
  const srcPath = path.join(srcDir, dir);
  const targetPath = path.join(targetDir, dir);
  
  if (fs.existsSync(srcPath)) {
    copyDirectory(srcPath, targetPath);
    console.log(`✓ Copied ${dir}/ directory`);
  } else {
    console.warn(`⚠ Warning: ${dir}/ not found in src/`);
  }
});

// Copy icons directory (PNGs and SVGs)
const srcIconsDir = path.join(srcDir, 'icons');
const iconsDir = path.join(targetDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy all icon files (PNGs for manifest, SVGs for UI)
const iconFiles = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png', 'logo-light.svg', 'logo-dark.svg'];
iconFiles.forEach(icon => {
  const srcPath = path.join(srcIconsDir, icon);
  const targetPath = path.join(iconsDir, icon);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, targetPath);
    console.log(`✓ Copied ${icon}`);
  } else {
    console.warn(`⚠ Warning: ${icon} not found in src/icons/`);
  }
});

// Browser-specific modifications
if (browser === 'chrome') {
  // Chrome uses chrome.* API, but our code handles both
  console.log('✓ Chrome-specific configuration ready');
}

if (browser === 'firefox') {
  // Firefox prefers browser.* API, which our code uses by default
  console.log('✓ Firefox-specific configuration ready');
}

if (browser === 'safari') {
  // Safari uses browser.* API as well
  console.log('✓ Safari-specific configuration ready');
}

console.log(`\n✅ ${browser} extension built successfully!`);
console.log(`📁 Output directory: ${targetDir}`);

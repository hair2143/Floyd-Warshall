const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const imagesDir = path.join(repoRoot, 'public', 'images');

    const targets = ['24BCE5512.jpg', '24BCE5515.jpg'];

    if (!fs.existsSync(imagesDir)) {
      console.error('Images directory not found:', imagesDir);
      process.exit(1);
    }

    for (const fileName of targets) {
      const filePath = path.join(imagesDir, fileName);
      if (!fs.existsSync(filePath)) {
        console.warn('Skipping (not found):', fileName);
        continue;
      }

      const backupPath = filePath + '.bak';
      // create a backup if not exists
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log('Created backup:', path.basename(backupPath));
      }

      // Resize to 150x150, contain (letterbox) with neutral background, compress as JPEG
      await sharp(filePath)
        .resize(150, 150, {
          fit: 'contain',
          background: { r: 226, g: 232, b: 240, alpha: 1 }
        })
        .jpeg({ quality: 90 })
        .toFile(filePath + '.tmp');

      // replace original
      fs.renameSync(filePath + '.tmp', filePath);
      console.log('Resized and overwritten:', fileName);
    }

    console.log('\nAll done. Resized images (if present) have been overwritten. Backups (*.bak) were created.');
  } catch (err) {
    console.error('Error resizing images:', err);
    process.exit(1);
  }
})();

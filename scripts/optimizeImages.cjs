const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function optimizeFolder(folderPath) {
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      await optimizeFolder(fullPath);
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
      const baseName = path.basename(file, ext);
      const outWebpPath = path.join(folderPath, `${baseName}.webp`);
      
      const beforeSize = stat.size;
      await sharp(fullPath)
        .webp({ quality: 80, effort: 6 })
        .toFile(outWebpPath);
      
      const afterSize = fs.statSync(outWebpPath).size;
      const reduction = (((beforeSize - afterSize) / beforeSize) * 100).toFixed(1);
      console.log(`[Optimized] ${file} (${(beforeSize / 1024).toFixed(1)} KB) -> ${baseName}.webp (${(afterSize / 1024).toFixed(1)} KB, -${reduction}%)`);
    }
  }
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  console.log('Optimizing images in:', publicDir);
  await optimizeFolder(publicDir);
  console.log('Optimization complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

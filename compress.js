const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputDir = path.join(__dirname, 'public', 'obras');

async function processImages() {
  const files = fs.readdirSync(inputDir);
  let totalSaved = 0;
  for (const file of files) {
    if (file.endsWith('.png') || file.endsWith('.jpeg') || file.endsWith('.jpg')) {
      const inputPath = path.join(inputDir, file);
      const ext = path.extname(file);
      const newFileName = file.replace(ext, '.webp');
      const outputPath = path.join(inputDir, newFileName);
      
      try {
        const metadata = await sharp(inputPath).metadata();
        const originalSize = fs.statSync(inputPath).size;
        
        let transform = sharp(inputPath);
        if (metadata.width > 1920) {
          transform = transform.resize({ width: 1920 });
        }
        
        await transform.webp({ quality: 80 }).toFile(outputPath);
        
        const newSize = fs.statSync(outputPath).size;
        const saved = originalSize - newSize;
        totalSaved += saved;
        
        console.log(`Converted ${file} to webp. Saved ${(saved / 1024 / 1024).toFixed(2)} MB`);
        
        // delete original file
        fs.unlinkSync(inputPath);
      } catch (e) {
        console.error(`Error processing ${file}:`, e);
      }
    }
  }
  console.log(`Total saved: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
}

processImages();

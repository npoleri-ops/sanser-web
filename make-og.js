const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function makeOg() {
  try {
    const inputPath = path.join(__dirname, 'public', 'obras', 'galpon-gable-terminado.webp');
    const outPublic = path.join(__dirname, 'public', 'og-image.jpg');
    const outApp = path.join(__dirname, 'app', 'opengraph-image.jpg');

    // Remove old pngs
    if (fs.existsSync(path.join(__dirname, 'public', 'og-image.png'))) {
      fs.unlinkSync(path.join(__dirname, 'public', 'og-image.png'));
    }
    if (fs.existsSync(path.join(__dirname, 'app', 'opengraph-image.png'))) {
      fs.unlinkSync(path.join(__dirname, 'app', 'opengraph-image.png'));
    }

    // Convert webp to jpg
    await sharp(inputPath)
      .resize({ width: 1200, height: 630, fit: 'cover' })
      .jpeg({ quality: 90 })
      .toFile(outPublic);
      
    await sharp(inputPath)
      .resize({ width: 1200, height: 630, fit: 'cover' })
      .jpeg({ quality: 90 })
      .toFile(outApp);

    console.log('Successfully created OG images');
  } catch(e) {
    console.error('Error:', e);
  }
}

makeOg();

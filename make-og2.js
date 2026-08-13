const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function makeOg() {
  try {
    const inputPath = path.join(__dirname, 'public', 'sanser-logo.jpeg');
    
    // We'll output to both .png locations for OG
    const outPublic = path.join(__dirname, 'public', 'og-image.png');
    const outApp = path.join(__dirname, 'app', 'opengraph-image.png');

    // Remove old pngs
    if (fs.existsSync(path.join(__dirname, 'public', 'og-image.png'))) {
      fs.unlinkSync(path.join(__dirname, 'public', 'og-image.png'));
    }
    if (fs.existsSync(path.join(__dirname, 'app', 'opengraph-image.png'))) {
      fs.unlinkSync(path.join(__dirname, 'app', 'opengraph-image.png'));
    }

    // Convert sanser-logo.jpeg to 1200x630
    await sharp(inputPath)
      .resize({ width: 1200, height: 630, fit: 'cover' })
      .png()
      .toFile(outPublic);
      
    await sharp(inputPath)
      .resize({ width: 1200, height: 630, fit: 'cover' })
      .png()
      .toFile(outApp);

    console.log('Successfully created logo OG images from sanser-logo.jpeg');
  } catch(e) {
    console.error('Error:', e);
  }
}

makeOg();

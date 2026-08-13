const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function makeOg() {
  try {
    const inputPath = path.join(__dirname, 'Sanser Logo.png');
    
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

    // Read the new high-res logo
    const logoBuffer = await sharp(inputPath)
      .resize({ width: 800, fit: 'contain' }) // scale logo to fit nicely
      .toBuffer();

    // Create a background #0D0D0D 1200x630
    const bg = sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 13, g: 13, b: 13, alpha: 1 } // #0D0D0D
      }
    });

    // Composite logo over bg
    const combinedBuffer = await bg.composite([{ input: logoBuffer, gravity: 'center' }]).png().toBuffer();

    fs.writeFileSync(outPublic, combinedBuffer);
    fs.writeFileSync(outApp, combinedBuffer);

    console.log('Successfully created logo OG images from Sanser Logo.png');
  } catch(e) {
    console.error('Error:', e);
  }
}

makeOg();

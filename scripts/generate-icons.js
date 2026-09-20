/**
 * توليد جميع أيقونات التطبيق من شعار المشروع الأصلي (public/logo.png).
 *
 * الاستخدام:
 *   node scripts/generate-icons.js
 *
 * ينتج:
 *   public/icon-192.png          أيقونة PWA 192x192
 *   public/icon-512.png          أيقونة PWA 512x512
 *   public/icon-512-maskable.png أيقونة مانحة (خلفية صلبة) 512x512
 *   public/apple-touch-icon.png  أيقونة iOS 180x180 (بدون شفافية)
 *   public/icon-1024.png         أيقونة المتاجر (Google Play / App Store) 1024x1024
 *   public/favicon-16.png        فافيكون 16x16
 *   public/favicon-32.png        فافيكون 32x32
 *   app/favicon.ico              فافيكون متعدد الأحجام (16/32/48)
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const APP = path.join(ROOT, 'app');
const LOGO = path.join(PUBLIC, 'logo.png');
// لون خلفية التطبيق (يتطابق مع theme_color في manifest)
const THEME = { r: 17, g: 24, b: 39 };

async function composite(size, iconSize, outPath) {
  const bg = await sharp({
    create: { width: size, height: size, channels: 4, background: THEME },
  })
    .png()
    .toBuffer();
  const icon = await sharp(LOGO).resize(iconSize, iconSize).png().toBuffer();
  const pad = Math.round((size - iconSize) / 2);
  await sharp(bg)
    .composite([{ input: icon, left: pad, top: pad }])
    .png()
    .toFile(outPath);
}

async function faviconIco() {
  // ICO (Windows) يدعم تضمين PNG منذ Vista — نبني الهيكل يدويًا
  const entries = [];
  const pngs = [];
  for (const size of [16, 32, 48]) {
    const bg = await sharp({
      create: { width: size, height: size, channels: 4, background: THEME },
    })
      .png()
      .toBuffer();
    const icon = await sharp(LOGO).resize(size - 4, size - 4).png().toBuffer();
    const pad = 2;
    const png = await sharp(bg)
      .composite([{ input: icon, left: pad, top: pad }])
      .png()
      .toBuffer();
    pngs.push(png);
    entries.push({
      width: size >= 256 ? 0 : size,
      height: size >= 256 ? 0 : size,
      offset: 6 + 16 * pngs.length,
    });
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const chunks = [header];
  let dataOffset = 6 + 16 * entries.length;
  for (let i = 0; i < entries.length; i++) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(entries[i].width, 0);
    dir.writeUInt8(entries[i].height, 1);
    dir.writeUInt8(0, 2); // palette
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bpp
    dir.writeUInt32LE(pngs[i].length, 8); // size
    dir.writeUInt32LE(dataOffset, 12); // offset
    dataOffset += pngs[i].length;
    chunks.push(dir);
  }
  for (const png of pngs) chunks.push(png);

  fs.mkdirSync(APP, { recursive: true });
  fs.writeFileSync(path.join(APP, 'favicon.ico'), Buffer.concat(chunks));
}

async function main() {
  await composite(192, 192, path.join(PUBLIC, 'icon-192.png'));
  await composite(512, 512, path.join(PUBLIC, 'icon-512.png'));
  await composite(512, 340, path.join(PUBLIC, 'icon-512-maskable.png'));
  await composite(180, 150, path.join(PUBLIC, 'apple-touch-icon.png'));
  await composite(1024, 860, path.join(PUBLIC, 'icon-1024.png'));
  await composite(16, 13, path.join(PUBLIC, 'favicon-16.png'));
  await composite(32, 26, path.join(PUBLIC, 'favicon-32.png'));
  await faviconIco();
  console.log('✓ تم توليد جميع الأيقونات بنجاح');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
import sharp from 'sharp';

function officialIconSource(indexSource) {
  const appleTouch = indexSource.match(/<link\b[^>]*\brel=["'][^"']*apple-touch-icon[^"']*["'][^>]*\bhref=["']data:image\/(?:png|jpe?g);base64,([^"']+)["'][^>]*>/i);
  const favicon = indexSource.match(/<link\b[^>]*\brel=["'][^"']*icon[^"']*["'][^>]*\bhref=["']data:image\/(?:png|jpe?g);base64,([^"']+)["'][^>]*>/i);
  const match = appleTouch || favicon;
  if (!match) throw new Error('Approved embedded MercaTax logo was not found in index.html');
  return Buffer.from(match[1], 'base64');
}

async function renderIcon(source, size, destination) {
  const radius = Math.round(size * 0.18);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );

  await sharp(source)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(destination);
}

export async function writeOfficialPwaIcons(indexSource, out) {
  const source = officialIconSource(indexSource);
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 512 || metadata.height < 512) {
    throw new Error('Approved embedded MercaTax logo must be at least 512x512');
  }

  await Promise.all([
    renderIcon(source, 192, `${out}/icon-192.png`),
    renderIcon(source, 512, `${out}/icon-512.png`),
    renderIcon(source, 180, `${out}/apple-touch-icon.png`),
  ]);
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export const MAX_WEBSITE_IMAGE_DIMENSION = 6000;

function readUInt16LE(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}

function readUInt32BE(buf: Buffer, offset: number): number {
  return buf.readUInt32BE(offset);
}

function pngDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: readUInt32BE(buf, 16), height: readUInt32BE(buf, 20) };
}

function gifDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 10) return null;
  const sig = buf.toString('ascii', 0, 6);
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
  return { width: readUInt16LE(buf, 6), height: readUInt16LE(buf, 8) };
}

function jpegDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = buf.readUInt16BE(offset + 2);
    if (length < 2) return null;
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 >= buf.length) return null;
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    const width = readUInt16LE(buf, 26) & 0x3fff;
    const height = readUInt16LE(buf, 28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (chunk === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const b1 = buf[21];
    const b2 = buf[22];
    const b3 = buf[23];
    const b4 = buf[24];
    const width = 1 + (b1 | ((b2 & 0x3f) << 8));
    const height = 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10));
    return { width, height };
  }
  if (chunk === 'VP8X') {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  return null;
}

function avifDimensions(buf: Buffer): ImageDimensions | null {
  const idx = buf.indexOf('ispe');
  if (idx === -1 || idx + 12 > buf.length) return null;
  const width = readUInt32BE(buf, idx + 4);
  const height = readUInt32BE(buf, idx + 8);
  if (!width || !height) return null;
  return { width, height };
}

export function getImageDimensions(buf: Buffer): ImageDimensions | null {
  const parsed =
    pngDimensions(buf) ??
    gifDimensions(buf) ??
    jpegDimensions(buf) ??
    webpDimensions(buf) ??
    avifDimensions(buf);
  if (!parsed) return null;
  if (!Number.isFinite(parsed.width) || !Number.isFinite(parsed.height)) return null;
  if (parsed.width <= 0 || parsed.height <= 0) return null;
  return parsed;
}

export function exceedsMaxDimension(dimensions: ImageDimensions): boolean {
  return dimensions.width > MAX_WEBSITE_IMAGE_DIMENSION || dimensions.height > MAX_WEBSITE_IMAGE_DIMENSION;
}

// Generates icon-192.png and icon-512.png
// White background, navy #1e3a5f airplane, no circle background
import { createWriteStream } from 'node:fs';
import { deflateSync } from 'node:zlib';

function writePNG(path, size) {
  function u32be(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
  function chunk(type, data) {
    const typeB = Buffer.from(type, 'ascii');
    const crc   = crc32(Buffer.concat([typeB, data]));
    return Buffer.concat([u32be(data.length), typeB, data, u32be(crc)]);
  }
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c;
    }
    return t;
  })();
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // RGBA pixel buffer — start with white background
  const pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 255; pixels[i+1] = 255; pixels[i+2] = 255; pixels[i+3] = 255;
  }

  const NAVY = [0x1e, 0x3a, 0x5f, 255];
  const cx = size / 2, cy = size / 2;

  function setPixel(x, y, rgba) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = rgba[0]; pixels[i+1] = rgba[1]; pixels[i+2] = rgba[2]; pixels[i+3] = rgba[3];
  }

  function fillQuad(pts, color) {
    const minY = Math.max(0, Math.ceil(Math.min(...pts.map(p => p[1]))));
    const maxY = Math.min(size - 1, Math.floor(Math.max(...pts.map(p => p[1]))));
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y && y < y1) || (y1 <= y && y < y0))
          xs.push(x0 + (y - y0) * (x1 - x0) / (y1 - y0));
      }
      if (xs.length >= 2) {
        xs.sort((a, b) => a - b);
        for (let x = Math.ceil(xs[0]); x <= Math.floor(xs[xs.length - 1]); x++)
          setPixel(x, y, color);
      }
    }
  }

  function drawLine(x0, y0, x1, y1, thick, color) {
    const len = Math.sqrt((x1-x0)**2 + (y1-y0)**2);
    if (len === 0) return;
    const nx = -(y1-y0)/len * thick/2, ny = (x1-x0)/len * thick/2;
    fillQuad([[x0+nx,y0+ny],[x1+nx,y1+ny],[x1-nx,y1-ny],[x0-nx,y0-ny]], color);
  }

  function fillCircle(cx2, cy2, rad, color) {
    for (let y = Math.ceil(cy2-rad); y <= Math.floor(cy2+rad); y++)
      for (let x = Math.ceil(cx2-rad); x <= Math.floor(cx2+rad); x++)
        if ((x-cx2)**2 + (y-cy2)**2 <= rad*rad) setPixel(x, y, color);
  }

  // ── Draw airplane facing right (horizontal) ──────────────────────────────
  // Fuselage: horizontal, centered, slightly right of center for balance
  const bodyLen = size * 0.52;
  const bodyW   = size * 0.085;
  const bx = cx + size * 0.03, by = cy;

  const noseX = bx + bodyLen / 2, noseY = by;
  const tailX = bx - bodyLen / 2, tailY = by;

  // Fuselage
  drawLine(tailX, tailY, noseX - size * 0.04, noseY, bodyW, NAVY);

  // Nose cone (pointed triangle)
  fillQuad([
    [noseX + size * 0.01, noseY],
    [noseX - size * 0.06, noseY - bodyW * 0.42],
    [noseX - size * 0.06, noseY + bodyW * 0.42],
  ], NAVY);

  // Main wings — swept back, wide
  const wingRootX = bx + size * 0.02, wingRootY = by;
  const wSpan = size * 0.33;
  const wChord = size * 0.085;
  // Left (top) wing: swept back from root upward
  fillQuad([
    [wingRootX + wChord * 0.5, wingRootY - bodyW * 0.4],
    [wingRootX - wChord * 0.5, wingRootY - bodyW * 0.4],
    [wingRootX - wChord * 1.5, wingRootY - wSpan],
    [wingRootX + wChord * 0.3, wingRootY - wSpan],
  ], NAVY);
  // Right (bottom) wing
  fillQuad([
    [wingRootX + wChord * 0.5, wingRootY + bodyW * 0.4],
    [wingRootX - wChord * 0.5, wingRootY + bodyW * 0.4],
    [wingRootX - wChord * 1.5, wingRootY + wSpan],
    [wingRootX + wChord * 0.3, wingRootY + wSpan],
  ], NAVY);

  // Tail fins — small, near tail
  const tFinX = tailX + size * 0.1;
  const tSpan = size * 0.16;
  const tChord = size * 0.06;
  // Top tail
  fillQuad([
    [tFinX + tChord * 0.5, tailY - bodyW * 0.4],
    [tFinX - tChord * 0.5, tailY - bodyW * 0.4],
    [tFinX - tChord * 0.8, tailY - tSpan],
    [tFinX + tChord * 0.3, tailY - tSpan],
  ], NAVY);
  // Bottom tail (smaller)
  fillQuad([
    [tFinX + tChord * 0.4, tailY + bodyW * 0.4],
    [tFinX - tChord * 0.4, tailY + bodyW * 0.4],
    [tFinX - tChord * 0.5, tailY + tSpan * 0.6],
    [tFinX + tChord * 0.2, tailY + tSpan * 0.6],
  ], NAVY);

  // ── Encode PNG ────────────────────────────────────────────────────────────
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const IHDR = chunk('IHDR', Buffer.concat([u32be(size), u32be(size), Buffer.from([8, 2, 0, 0, 0])]));

  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0;
    for (let x = 0; x < size; x++) {
      const pi = (y * size + x) * 4;
      const ri = y * (1 + size * 3) + 1 + x * 3;
      const a  = pixels[pi + 3] / 255;
      raw[ri]   = Math.round(pixels[pi]   * a + 255 * (1 - a));
      raw[ri+1] = Math.round(pixels[pi+1] * a + 255 * (1 - a));
      raw[ri+2] = Math.round(pixels[pi+2] * a + 255 * (1 - a));
    }
  }
  const IDAT = chunk('IDAT', deflateSync(raw, { level: 6 }));
  const IEND = chunk('IEND', Buffer.alloc(0));

  const ws = createWriteStream(path);
  ws.write(sig); ws.write(IHDR); ws.write(IDAT); ws.write(IEND); ws.end();
  console.log(`Written: ${path} (${size}×${size})`);
}

writePNG('./icon-192.png', 192);
writePNG('./icon-512.png', 512);

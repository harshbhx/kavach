// Generates the security-printing line-work used on the site: guilloche rosettes, a repeating guilloche
// band and a fine lattice. Pure math, no source images. Run: node scripts/make-print-assets.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/print');
const f = (n) => Number(n.toFixed(1));

function curve(points) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + 'Z';
}

// Epitrochoid family, each copy rotated a little: the classic banknote rosette.
function rosette({ size, R, r, d, copies, steps, stroke, opacity, width, inner }) {
  const c = size / 2;
  const s = (size / 2 - 4) / (R + r + d);
  const turns = r / gcd(R, r);
  const paths = [];
  for (let k = 0; k < copies; k++) {
    const rot = (k / copies) * ((2 * Math.PI) / (R / gcd(R, r)));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 2 * Math.PI * turns;
      const x = (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t);
      const y = (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t);
      pts.push([c + s * (x * Math.cos(rot) - y * Math.sin(rot)), c + s * (x * Math.sin(rot) + y * Math.cos(rot))]);
    }
    paths.push(`<path d="${curve(pts)}"/>`);
  }
  if (inner) {
    // a second, tighter hypotrochoid ring inside the first
    const { R: R2, r: r2, d: d2, copies: n2 } = inner;
    const s2 = (R + r - d) * s * 0.92 / (R2 - r2 + d2);
    const turns2 = r2 / gcd(R2, r2);
    for (let k = 0; k < n2; k++) {
      const rot = (k / n2) * ((2 * Math.PI) / (R2 / gcd(R2, r2)));
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * 2 * Math.PI * turns2;
        const x = (R2 - r2) * Math.cos(t) + d2 * Math.cos(((R2 - r2) / r2) * t);
        const y = (R2 - r2) * Math.sin(t) - d2 * Math.sin(((R2 - r2) / r2) * t);
        pts.push([c + s2 * (x * Math.cos(rot) - y * Math.sin(rot)), c + s2 * (x * Math.sin(rot) + y * Math.cos(rot))]);
      }
      paths.push(`<path d="${curve(pts)}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}">${paths.join('')}</svg>`;
}

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

// Interlaced sine strands that tile horizontally (whole number of cycles per tile).
function band({ w, h, strands, cycles, stroke, opacity, width }) {
  const mid = h / 2;
  const paths = [];
  for (const [amp, cyc, phaseStep] of [
    [h * 0.38, cycles, Math.PI / strands],
    [h * 0.22, cycles * 2, (Math.PI * 2) / strands],
  ]) {
    for (let s = 0; s < strands; s++) {
      const pts = [];
      for (let x = 0; x <= w; x += 2) {
        pts.push([x, mid + amp * Math.sin((x / w) * cyc * 2 * Math.PI + s * phaseStep)]);
      }
      paths.push(`<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('')}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}">${paths.join('')}</svg>`;
}

// A fine diagonal lattice: the pantograph ground the VOID letters hide in.
function lattice({ size, gap, stroke, opacity, width }) {
  const lines = [];
  for (let i = -size; i <= size * 2; i += gap) {
    lines.push(`<path d="M${i} 0L${i + size} ${size}"/>`, `<path d="M${i} ${size}L${i + size} 0"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}">${lines.join('')}</svg>`;
}

await mkdir(out, { recursive: true });
const files = {
  'rosette-large.svg': rosette({ size: 900, R: 250, r: 25, d: 70, copies: 14, steps: 520, stroke: '#2e7d6f', opacity: 0.3, width: 0.55, inner: { R: 160, r: 32, d: 60, copies: 8 } }),
  'rosette-seal.svg': rosette({ size: 240, R: 90, r: 15, d: 30, copies: 8, steps: 520, stroke: '#0e231c', opacity: 0.6, width: 0.45, inner: { R: 50, r: 10, d: 20, copies: 5 } }),
  'band.svg': band({ w: 240, h: 28, strands: 6, cycles: 3, stroke: '#2e7d6f', opacity: 0.55, width: 0.55 }),
  'band-rose.svg': band({ w: 240, h: 28, strands: 6, cycles: 3, stroke: '#c8203f', opacity: 0.45, width: 0.55 }),
  'lattice.svg': lattice({ size: 12, gap: 6, stroke: '#0b6e7f', opacity: 0.22, width: 0.5 }),
};
for (const [name, svg] of Object.entries(files)) {
  await writeFile(path.join(out, name), svg);
  console.log(`${name}: ${(svg.length / 1024).toFixed(1)} KB`);
}

// Pure-TypeScript QR code generator. No external dependencies, no new packages.
//
// Encodes a UTF-8 string in byte mode at error correction level M (≈15% recovery),
// auto-selects the smallest version (1..10) that fits the data, applies the
// lowest-penalty mask, and returns the module matrix (true = dark module).
//
// Everything here is client-side: the payload never leaves the browser (no
// third-party QR API round-trip). Used by components/QRCodeDisplay to draw the
// QR onto a <canvas>.
//
// Supports versions 1–10 at EC level M. That covers byte payloads up to 213
// bytes, which is well above the ~141-byte signed QR token this app produces
// ("KGOAPP:v1:<base64url(JSON)>:<hmac>").
//
// References (ISO/IEC 18004, cross-checked against thonky.com QR tutorial):
//   - EC characteristics table for level M (versions 1–10)
//   - Alignment pattern center coordinates
//   - Format information (BCH(15,5), XOR mask 0x5412) and module placement
//   - Version information (BCH(18,6)) and module placement
//   - Reed–Solomon over GF(256), primitive polynomial 0x11D

export type QRMatrix = boolean[][];

// ───────────────────────────────────────────────────────────────────────────
// Reed–Solomon over GF(256)
// ───────────────────────────────────────────────────────────────────────────

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

// Generator polynomial for `degree` EC codewords. Returned with index 0 as the
// constant term and index `degree` as the leading coefficient (always 1).
function rsGenPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j + 1] ^= poly[j]; // x term shifts degree up
      next[j] ^= gfMul(poly[j], GF_EXP[i]); // constant term α^i
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGenPoly(ecLen).slice().reverse(); // gen[0] = leading coeff = 1
  const buf = data.concat(new Array<number>(ecLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const factor = buf[i];
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) buf[i + j] ^= gfMul(gen[j], factor);
    }
  }
  return buf.slice(data.length);
}

// Exported for testing (hand-verified Reed–Solomon references).
export const _rsGenPoly = rsGenPoly;
export const _rsEncode = rsEncode;

// ───────────────────────────────────────────────────────────────────────────
// BCH encoding for format / version information
// ───────────────────────────────────────────────────────────────────────────

function bchReduce(data: number, totalBits: number, gen: number, genDegree: number): number {
  const dataBits = totalBits - genDegree + 0; // data bits = total - parity, parity = genDegree
  // (parityBits == genDegree for these codes)
  void dataBits;
  let rem = data << genDegree; // shift data into high positions (degree up to totalBits-1)
  for (let i = totalBits - 1; i >= genDegree; i--) {
    if (rem & (1 << i)) rem ^= gen << (i - genDegree);
  }
  return (data << genDegree) | rem;
}

/** 15-bit format string for (ecLevel, mask). ecLevel: L=1, M=0, Q=3, H=2. */
export function bchFormat(ecLevel: number, mask: number): number {
  const data = (ecLevel << 3) | mask; // 5 bits
  return bchReduce(data, 15, 0x537, 10) ^ 0x5412;
}

/** 18-bit version information string for `version` (7..40). */
export function bchVersion(version: number): number {
  return bchReduce(version, 18, 0x1f25, 12);
}

// ───────────────────────────────────────────────────────────────────────────
// Per-version tables (EC level M, versions 1–10)
// ───────────────────────────────────────────────────────────────────────────

interface ECEntry {
  data: number; // total data codewords
  ec: number; // EC codewords per block
  g1c: number; // group 1 block count
  g1l: number; // group 1 codewords per block
  g2c: number; // group 2 block count
  g2l: number; // group 2 codewords per block
}

// Error-correction characteristics for level M, versions 1–10
// (cross-checked against the ISO/IEC 18004 EC characteristics table).
const EC_TABLE_M: ECEntry[] = [
  { data: 16, ec: 10, g1c: 1, g1l: 16, g2c: 0, g2l: 0 }, // V1
  { data: 28, ec: 16, g1c: 1, g1l: 28, g2c: 0, g2l: 0 }, // V2
  { data: 44, ec: 26, g1c: 1, g1l: 44, g2c: 0, g2l: 0 }, // V3
  { data: 64, ec: 18, g1c: 2, g1l: 32, g2c: 0, g2l: 0 }, // V4
  { data: 86, ec: 24, g1c: 2, g1l: 43, g2c: 0, g2l: 0 }, // V5
  { data: 108, ec: 16, g1c: 4, g1l: 27, g2c: 0, g2l: 0 }, // V6
  { data: 124, ec: 18, g1c: 4, g1l: 31, g2c: 0, g2l: 0 }, // V7
  { data: 154, ec: 22, g1c: 2, g1l: 38, g2c: 2, g2l: 39 }, // V8
  { data: 182, ec: 22, g1c: 3, g1l: 36, g2c: 2, g2l: 37 }, // V9
  { data: 216, ec: 26, g1c: 4, g1l: 43, g2c: 1, g2l: 44 }, // V10
];

// Alignment-pattern center coordinates per version (index = version - 1).
const ALIGN_CENTERS: number[][] = [
  [], // V1
  [6, 18], // V2
  [6, 22], // V3
  [6, 26], // V4
  [6, 30], // V5
  [6, 34], // V6
  [6, 22, 38], // V7
  [6, 24, 42], // V8
  [6, 26, 46], // V9
  [6, 28, 50], // V10
];

function byteCapacity(version: number): number {
  const e = EC_TABLE_M[version - 1];
  const countBits = version <= 9 ? 8 : 16; // byte-mode char-count indicator width
  return Math.floor((e.data * 8 - 4 - countBits) / 8);
}

const MAX_VERSION = 10; // supported range
const MAX_CAPACITY = byteCapacity(MAX_VERSION); // 213 bytes

// ───────────────────────────────────────────────────────────────────────────
// Data encoding (byte mode)
// ───────────────────────────────────────────────────────────────────────────

function toUtf8(s: string): number[] {
  return Array.from(new TextEncoder().encode(s));
}

// Exported for testing (round-trip verification).
export const _toUtf8 = toUtf8;

// Build the data codeword stream for byte mode: mode + count + bytes +
// terminator + zero-pad to a byte boundary + alternate 0xEC/0x11 pad bytes
// until the stream fills the version's data-codeword capacity.
function encodeData(bytes: number[], version: number): number[] {
  const e = EC_TABLE_M[version - 1];
  const countBits = version <= 9 ? 8 : 16;
  const bits: number[] = [];
  // mode indicator: byte = 0100
  bits.push(0, 1, 0, 0);
  // character-count indicator
  for (let i = countBits - 1; i >= 0; i--) bits.push((bytes.length >> i) & 1);
  // data (MSB first per byte)
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  // terminator (up to 4 zero bits, only if there is room)
  const totalDataBits = e.data * 8;
  const term = Math.min(4, totalDataBits - bits.length);
  if (term > 0) for (let i = 0; i < term; i++) bits.push(0);
  // pad to a byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // pack into codewords
  const cw: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    cw.push(v);
  }
  // pad bytes 0xEC / 0x11 alternating
  let pad = 0xec;
  while (cw.length < e.data) {
    cw.push(pad);
    pad = pad === 0xec ? 0x11 : 0xec;
  }
  return cw;
}

// Split data codewords into RS blocks, compute EC per block, then interleave
// data codewords and EC codewords the way the QR spec requires.
function interleave(dataCw: number[], version: number): number[] {
  const e = EC_TABLE_M[version - 1];
  const blocks: number[][] = [];
  let idx = 0;
  for (let i = 0; i < e.g1c; i++) {
    blocks.push(dataCw.slice(idx, idx + e.g1l));
    idx += e.g1l;
  }
  for (let i = 0; i < e.g2c; i++) {
    blocks.push(dataCw.slice(idx, idx + e.g2l));
    idx += e.g2l;
  }
  const ecBlocks = blocks.map((b) => rsEncode(b, e.ec));

  const out: number[] = [];
  const maxLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const b of blocks) if (i < b.length) out.push(b[i]);
  }
  for (let i = 0; i < e.ec; i++) {
    for (const b of ecBlocks) out.push(b[i]);
  }
  return out;
}

// Exported for testing (round-trip verification).
export const _encodeData = encodeData;
export const _interleave = interleave;

// ───────────────────────────────────────────────────────────────────────────
// Function patterns + reserved-area bookkeeping
// ───────────────────────────────────────────────────────────────────────────

export interface BaseMatrix {
  matrix: boolean[][];
  reserved: boolean[][];
}

export function buildBase(version: number): BaseMatrix {
  const size = (version - 1) * 4 + 21;
  const matrix: boolean[][] = [];
  const reserved: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    matrix.push(new Array<boolean>(size).fill(false));
    reserved.push(new Array<boolean>(size).fill(false));
  }

  placeFinder(matrix, reserved, "tl", size);
  placeFinder(matrix, reserved, "tr", size);
  placeFinder(matrix, reserved, "bl", size);

  // Timing patterns (row 6 and column 6), alternating starting dark at 8.
  for (let i = 8; i < size - 8; i++) {
    const v = i % 2 === 0;
    matrix[6][i] = v;
    matrix[i][6] = v;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  // Alignment patterns
  const centers = ALIGN_CENTERS[version - 1];
  for (const cr of centers) {
    for (const cc of centers) {
      const overlapsFinder =
        (cr <= 6 && cc <= 6) || // top-left corner of grid
        (cr <= 6 && cc >= size - 7) || // top-right
        (cr >= size - 7 && cc <= 6); // bottom-left
      if (overlapsFinder) continue;
      placeAlignment(matrix, reserved, cr, cc);
    }
  }

  // Reserve the dark module + format-info regions (filled later, per mask).
  reserveFormat(reserved, size);
  reserved[size - 8][8] = true; // always-dark module

  if (version >= 7) reserveVersion(reserved, size);

  return { matrix, reserved };
}

function placeFinder(
  m: boolean[][],
  res: boolean[][],
  corner: "tl" | "tr" | "bl",
  size: number
): void {
  let r0 = 0;
  let c0 = 0;
  if (corner === "tl") {
    r0 = 0;
    c0 = 0;
  } else if (corner === "tr") {
    r0 = 0;
    c0 = size - 7;
  } else {
    r0 = size - 7;
    c0 = 0;
  }
  for (let dr = 0; dr < 7; dr++) {
    for (let dc = 0; dc < 7; dc++) {
      const r = r0 + dr;
      const c = c0 + dc;
      const outer = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      // The inner 3×3 (rows/cols 2–4) is a solid dark square.
      const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      m[r][c] = outer || inner;
      res[r][c] = true;
    }
  }
  // 1-module light separators on the interior sides of the finder.
  if (corner === "tl") {
    for (let i = 0; i <= 7; i++) {
      m[7][i] = false;
      res[7][i] = true;
      m[i][7] = false;
      res[i][7] = true;
    }
  } else if (corner === "tr") {
    for (let i = 0; i <= 7; i++) {
      m[7][size - 8 + i] = false;
      res[7][size - 8 + i] = true;
      m[i][size - 8] = false;
      res[i][size - 8] = true;
    }
  } else {
    for (let i = 0; i <= 7; i++) {
      m[size - 8][i] = false;
      res[size - 8][i] = true;
      m[size - 8 + i][7] = false;
      res[size - 8 + i][7] = true;
    }
  }
}

function placeAlignment(m: boolean[][], res: boolean[][], cr: number, cc: number): void {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = cr + dr;
      const c = cc + dc;
      const outer = Math.abs(dr) === 2 || Math.abs(dc) === 2;
      const center = dr === 0 && dc === 0;
      m[r][c] = outer || center;
      res[r][c] = true;
    }
  }
}

// Format-info module coordinates (bit index 0 = least significant bit).
export const FORMAT_COPY1: Array<[number, number]> = [
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
  [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
];

function formatCopy2(size: number): Array<[number, number]> {
  return [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4],
    [8, size - 5], [8, size - 6], [8, size - 7], [8, size - 8],
    [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8],
    [size - 3, 8], [size - 2, 8], [size - 1, 8],
  ];
}

function reserveFormat(res: boolean[][], size: number): void {
  for (const [r, c] of FORMAT_COPY1) res[r][c] = true;
  for (const [r, c] of formatCopy2(size)) res[r][c] = true;
}

function placeFormatInfo(m: boolean[][], size: number, fmt: number): void {
  const copy2 = formatCopy2(size);
  for (let b = 0; b < 15; b++) {
    const v = ((fmt >> b) & 1) === 1;
    const [r1, c1] = FORMAT_COPY1[b];
    const [r2, c2] = copy2[b];
    m[r1][c1] = v;
    m[r2][c2] = v;
  }
  // The always-dark module sits just below the top-left finder, at (size-8, 8).
  m[size - 8][8] = true;
}

function reserveVersion(res: boolean[][], size: number): void {
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      res[i][size - 11 + j] = true; // top-right block: rows 0–5, cols size-11..size-9
      res[size - 11 + j][i] = true; // bottom-left block: rows size-11..size-9, cols 0–5
    }
  }
}

function placeVersionInfo(m: boolean[][], size: number, versionBits: number): void {
  for (let b = 0; b < 18; b++) {
    const v = ((versionBits >> b) & 1) === 1;
    // bottom-left block: row = size-11 + (b % 3), col = floor(b / 3)
    m[size - 11 + (b % 3)][Math.floor(b / 3)] = v;
    // top-right block: row = b % 6, col = size-11 + floor(b / 6)
    m[b % 6][size - 11 + Math.floor(b / 6)] = v;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Data placement (zig-zag), masking, penalty scoring
// ───────────────────────────────────────────────────────────────────────────

function placeData(
  m: boolean[][],
  reserved: boolean[][],
  codewords: number[],
  size: number
): Array<[number, number]> {
  const bits: number[] = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
  let bi = 0;
  const positions: Array<[number, number]> = [];
  let col = size - 1;
  let up = true;
  while (col >= 0) {
    for (let i = 0; i < size; i++) {
      const row = up ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (x < 0) continue;
        if (!reserved[row][x] && bi < bits.length) {
          m[row][x] = bits[bi] === 1;
          positions.push([row, x]);
          bi++;
        }
      }
    }
    up = !up;
    col -= 2;
    if (col === 6) col--; // skip the vertical timing column
  }
  return positions;
}

const MASKS: Array<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

const PATTERN_A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]; // 1011101 + 0000
const PATTERN_B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]; // 0000 + 1011101

function penalty1(m: boolean[][], size: number): number {
  let p = 0;
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (m[r][c] === m[r][c - 1]) run++;
      else {
        if (run >= 5) p += run - 2;
        run = 1;
      }
    }
    if (run >= 5) p += run - 2;
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (m[r][c] === m[r - 1][c]) run++;
      else {
        if (run >= 5) p += run - 2;
        run = 1;
      }
    }
    if (run >= 5) p += run - 2;
  }
  return p;
}

function penalty2(m: boolean[][], size: number): number {
  let p = 0;
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
    }
  }
  return p;
}

function penalty3(m: boolean[][], size: number): number {
  let p = 0;
  const match = (get: (i: number) => number) => {
    let a = true;
    let b = true;
    for (let i = 0; i < 11; i++) {
      const v = get(i);
      if (v !== PATTERN_A[i]) a = false;
      if (v !== PATTERN_B[i]) b = false;
    }
    if (a) p += 40;
    if (b) p += 40;
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) match((i) => (m[r][c + i] ? 1 : 0));
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) match((i) => (m[r + i][c] ? 1 : 0));
  }
  return p;
}

function penalty4(m: boolean[][], size: number): number {
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (m[r][c]) dark++;
  const percent = (dark * 100) / (size * size);
  return 10 * Math.floor(Math.abs(percent - 50) / 5);
}

function totalPenalty(m: boolean[][], size: number): number {
  return penalty1(m, size) + penalty2(m, size) + penalty3(m, size) + penalty4(m, size);
}

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

export interface QRResult {
  matrix: QRMatrix;
  version: number;
  size: number;
  mask: number;
}

function clone(m: boolean[][]): boolean[][] {
  return m.map((row) => row.slice());
}

/** Generate a QR matrix for `text` at EC level M. */
export function generateQR(text: string): QRResult {
  const bytes = toUtf8(text);
  if (bytes.length > MAX_CAPACITY) {
    throw new Error(
      `QR data too large: ${bytes.length} bytes exceeds max ${MAX_CAPACITY} (V${MAX_VERSION}-M)`
    );
  }
  let version = 1;
  while (version < MAX_VERSION && bytes.length > byteCapacity(version)) version++;
  // If bytes still exceed the chosen version's capacity (e.g. exactly at the
  // boundary), bump once more if possible.
  while (version < MAX_VERSION && bytes.length > byteCapacity(version)) version++;
  if (bytes.length > byteCapacity(version)) {
    throw new Error(`QR data too large for V${version}-M`);
  }

  const size = (version - 1) * 4 + 21;
  const dataCw = encodeData(bytes, version);
  const finalCw = interleave(dataCw, version);
  const base = buildBase(version);
  // Version info is mask-independent → place once in the base matrix.
  if (version >= 7) placeVersionInfo(base.matrix, size, bchVersion(version));

  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  let bestMask = 0;
  for (let mask = 0; mask < 8; mask++) {
    const m = clone(base.matrix);
    const positions = placeData(m, base.reserved, finalCw, size);
    for (const [r, c] of positions) {
      if (MASKS[mask](r, c)) m[r][c] = !m[r][c];
    }
    placeFormatInfo(m, size, bchFormat(0, mask)); // EC level M = 0
    const score = totalPenalty(m, size);
    if (score < bestScore) {
      bestScore = score;
      best = m;
      bestMask = mask;
    }
  }
  return { matrix: best as boolean[][], version, size, mask: bestMask };
}

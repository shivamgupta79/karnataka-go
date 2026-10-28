import { describe, expect, it } from "vitest";
import {
  bchFormat,
  bchVersion,
  buildBase,
  generateQR,
  _encodeData,
  _interleave,
  _rsGenPoly,
  _rsEncode,
  _toUtf8,
  FORMAT_COPY1,
  type BaseMatrix,
} from "./qrcode";

// ── Reed–Solomon (hand-verified) ─────────────────────────────────────────────
// (x + α^0)(x + α^1) = (x+1)(x+2) = x² + 3x + 2 over GF(256) with α=2.
// rsGenPoly returns [constant, x, x²] so degree-2 = [2, 3, 1].
describe("Reed–Solomon", () => {
  it("generator polynomial degree 2 = x² + 3x + 2", () => {
    expect(_rsGenPoly(2)).toEqual([2, 3, 1]);
  });

  it("generator polynomial leading coeff is always 1", () => {
    expect(_rsGenPoly(10)[10]).toBe(1);
  });

  it("encodes a single codeword with 2 EC = [3, 2]", () => {
    // m(x)=1 → remainder d0·(3x+2) = 3x+2 → [3, 2] (x-coeff, constant)
    expect(_rsEncode([1], 2)).toEqual([3, 2]);
  });

  it("encodes all-zeros to all-zeros", () => {
    expect(_rsEncode([0, 0, 0, 0], 3)).toEqual([0, 0, 0]);
  });
});
describe("BCH format/version strings (against ISO 18004 table anchors)", () => {
  it("format info for level M", () => {
    // Cross-checked against thonky.com format-version tables.
    expect(bchFormat(0, 0)).toBe(0x5412); // M0
    expect(bchFormat(0, 1)).toBe(0x5125); // M1
    expect(bchFormat(0, 2)).toBe(0x5e7c); // M2
    expect(bchFormat(0, 7)).toBe(0x4aa0); // M7
  });

  it("version info for versions 7 and 8", () => {
    expect(bchVersion(7)).toBe(0x7c94);
    expect(bchVersion(8)).toBe(0x85bc);
  });
});

// ── Structural invariants of generated matrices ────────────────────────────

function readFormatInfo(matrix: boolean[][], size: number): number {
  // Read the 15 bits from copy 1 (FORMAT_COPY1), bit 0 = LSB.
  let value = 0;
  for (let b = 0; b < 15; b++) {
    const [r, c] = FORMAT_COPY1[b];
    if (matrix[r][c]) value |= 1 << b;
  }
  return value;
}

function readFormatInfoCopy2(matrix: boolean[][], size: number): number {
  const copy2: Array<[number, number]> = [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4],
    [8, size - 5], [8, size - 6], [8, size - 7], [8, size - 8],
    [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8],
    [size - 3, 8], [size - 2, 8], [size - 1, 8],
  ];
  let value = 0;
  for (let b = 0; b < 15; b++) {
    const [r, c] = copy2[b];
    if (matrix[r][c]) value |= 1 << b;
  }
  return value;
}

function readVersionInfoBlock1(matrix: boolean[][], size: number): number {
  // top-right block: bit b at (b % 6, size-11 + floor(b/6))
  let value = 0;
  for (let b = 0; b < 18; b++) {
    if (matrix[b % 6][size - 11 + Math.floor(b / 6)]) value |= 1 << b;
  }
  return value;
}

function readVersionInfoBlock2(matrix: boolean[][], size: number): number {
  // bottom-left block: bit b at (size-11 + (b%3), floor(b/3))
  let value = 0;
  for (let b = 0; b < 18; b++) {
    if (matrix[size - 11 + (b % 3)][Math.floor(b / 3)]) value |= 1 << b;
  }
  return value;
}

// Independent zig-zag read-back of the data modules (re-implemented here, not
// sharing placeData) so a placement bug is caught rather than mirrored.
function readDataCodewords(
  matrix: boolean[][],
  reserved: boolean[][],
  size: number,
  mask: number
): number[] {
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
  const maskFn = MASKS[mask];
  const bits: number[] = [];
  let col = size - 1;
  let up = true;
  while (col >= 0) {
    for (let i = 0; i < size; i++) {
      const row = up ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (x < 0) continue;
        if (!reserved[row][x]) {
          let bit = matrix[row][x] ? 1 : 0;
          if (maskFn(row, x)) bit ^= 1; // undo the mask
          bits.push(bit);
        }
      }
    }
    up = !up;
    col -= 2;
    if (col === 6) col--;
  }
  // Pack bits (MSB first) into codewords.
  const cw: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    cw.push(v);
  }
  return cw;
}

function isFinderTopLeft(m: boolean[][]): boolean {
  // Canonical 7x7 finder pattern at (0,0).
  const expected = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 7; c++)
      if (m[r][c] !== (expected[r][c] === 1)) return false;
  return true;
}

describe("generateQR structural invariants", () => {
  it("small string fits version 1 and has correct size", () => {
    const { matrix, version, size } = generateQR("Hello");
    expect(version).toBe(1);
    expect(size).toBe(21);
    expect(matrix.length).toBe(21);
    expect(matrix[0].length).toBe(21);
  });

  it("has valid finder patterns at all three corners", () => {
    const { matrix, size } = generateQR("Hello");
    expect(isFinderTopLeft(matrix)).toBe(true);
    // top-right finder at rows 0..6, cols size-7..size-1
    const tr = (r: number, c: number) => matrix[r][size - 7 + c];
    expect(tr(0, 0)).toBe(true);
    expect(tr(1, 1)).toBe(false);
    expect(tr(3, 3)).toBe(true);
    // bottom-left finder at rows size-7..size-1, cols 0..6
    const bl = (r: number, c: number) => matrix[size - 7 + r][c];
    expect(bl(0, 0)).toBe(true);
    expect(bl(1, 1)).toBe(false);
    expect(bl(3, 3)).toBe(true);
  });

  it("dark module is set", () => {
    const { matrix, size } = generateQR("Hello");
    expect(matrix[size - 8][8]).toBe(true);
  });

  it("format info: both copies agree and are valid BCH for the chosen mask", () => {
    const { matrix, size, mask } = generateQR("Hello world test");
    const v1 = readFormatInfo(matrix, size);
    const v2 = readFormatInfoCopy2(matrix, size);
    expect(v1).toBe(v2);
    expect(v1).toBe(bchFormat(0, mask)); // level M = 0
  });

  it("version info present and consistent for V7+ payloads", () => {
    // Build a string long enough to need version 8 (byte capacity 152).
    const long = "KGOAPP:v1:" + "A".repeat(130) + ":" + "B".repeat(43);
    const { matrix, size, version } = generateQR(long);
    expect(version).toBeGreaterThanOrEqual(7);
    const b1 = readVersionInfoBlock1(matrix, size);
    const b2 = readVersionInfoBlock2(matrix, size);
    expect(b1).toBe(b2);
    expect(b1).toBe(bchVersion(version));
  });

  it("round-trips the data: reading modules back reconstructs the codewords", () => {
    const text = "KGOAPP:v1:eyJ1aWQiOiJhYmMifQ:sig";
    const { matrix, size, version, mask } = generateQR(text);
    const base: BaseMatrix = buildBase(version);
    const readBack = readDataCodewords(matrix, base.reserved, size, mask);
    const expected = _interleave(_encodeData(_toUtf8(text), version), version);
    expect(readBack).toEqual(expected);
  });

  it("rejects payloads larger than the supported capacity", () => {
    expect(() => generateQR("X".repeat(300))).toThrow();
  });
});

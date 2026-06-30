import { describe, it, expect } from "vitest";
import {
  makeGrid,
  translate,
  blur,
  noise,
  brightness,
  psnr,
  ssim,
  downsample,
  seededRandom,
} from "./field";

const copy = (g: ReturnType<typeof makeGrid>) => ({ ...g, data: g.data.slice() });

describe("grid metrics", () => {
  it("psnr is Infinity for identical grids", () => {
    const g = makeGrid(16, 16, 100);
    expect(psnr(g, copy(g))).toBe(Infinity);
  });

  it("ssim is 1 for identical grids", () => {
    const g = makeGrid(16, 16, 100);
    expect(ssim(g, copy(g))).toBeCloseTo(1, 5);
  });

  it("psnr decreases as distortion grows", () => {
    const g = makeGrid(32, 32);
    for (let i = 0; i < g.data.length; i++) g.data[i] = (i * 37) % 256;
    expect(psnr(g, brightness(g, 5))).toBeGreaterThan(psnr(g, brightness(g, 30)));
  });

  it("psnr/ssim throw on size mismatch", () => {
    expect(() => psnr(makeGrid(4, 4), makeGrid(8, 8))).toThrow();
  });
});

describe("distortions", () => {
  it("translate shifts right and zero-fills the freed column", () => {
    const g = makeGrid(4, 1);
    g.data.set([10, 20, 30, 40]);
    expect(Array.from(translate(g, 1).data)).toEqual([0, 10, 20, 30]);
  });

  it("brightness clamps to [0, 255]", () => {
    const g = makeGrid(2, 1);
    g.data.set([250, 5]);
    expect(Array.from(brightness(g, 20).data)).toEqual([255, 25]);
    expect(Array.from(brightness(g, -20).data)).toEqual([230, 0]);
  });

  it("blur of a flat grid is the flat grid", () => {
    const g = makeGrid(8, 8, 120);
    const b = blur(g, 2);
    for (const v of b.data) expect(v).toBeCloseTo(120, 2);
  });

  it("noise is deterministic under a seeded RNG", () => {
    const g = makeGrid(8, 8, 100);
    const a = noise(g, 20, seededRandom(42));
    const b = noise(g, 20, seededRandom(42));
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });
});

describe("downsample", () => {
  it("box-averages a 4×4 into a 2×2", () => {
    const g = makeGrid(4, 4, 0);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g.data[y * 4 + x] = 100;
    const d = downsample(g, 2, 2);
    expect(d.w).toBe(2);
    expect(d.h).toBe(2);
    expect(d.data[0]).toBeCloseTo(100, 5); // top-left quadrant average
    expect(d.data[3]).toBeCloseTo(0, 5); // bottom-right quadrant average
  });
});

import { describe, it, expect } from 'vitest';
import { validateImage, MAX_IMAGE_BYTES } from '../lib/image';

function makeJpeg(extraBytes = 0): ArrayBuffer {
  const buf = new Uint8Array(3 + extraBytes);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
  return buf.buffer;
}

function makePng(extraBytes = 0): ArrayBuffer {
  const buf = new Uint8Array(4 + extraBytes);
  buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4e; buf[3] = 0x47;
  return buf.buffer;
}

function makeWebp(): ArrayBuffer {
  const buf = new Uint8Array(12);
  // RIFF header
  buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46;
  // WEBP marker at offset 8
  buf[8] = 0x57; buf[9] = 0x45; buf[10] = 0x42; buf[11] = 0x50;
  return buf.buffer;
}

function makeGarbage(): ArrayBuffer {
  const buf = new Uint8Array(16).fill(0xAB);
  return buf.buffer;
}

describe('validateImage', () => {
  it('accepts a valid JPEG', () => {
    const result = validateImage(makeJpeg(100));
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.type).toBe('image/jpeg');
      expect(result.ext).toBe('.jpg');
    }
  });

  it('accepts a valid PNG', () => {
    const result = validateImage(makePng(100));
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.type).toBe('image/png');
      expect(result.ext).toBe('.png');
    }
  });

  it('accepts a valid WebP', () => {
    const result = validateImage(makeWebp());
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.type).toBe('image/webp');
      expect(result.ext).toBe('.webp');
    }
  });

  it('rejects unknown format with 415', () => {
    const result = validateImage(makeGarbage());
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.status).toBe(415);
  });

  it('rejects a RIFF header that is not WebP with 415', () => {
    const buf = new Uint8Array(12);
    buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46;
    // AVI instead of WEBP at offset 8
    buf[8] = 0x41; buf[9] = 0x56; buf[10] = 0x49; buf[11] = 0x20;
    const result = validateImage(buf.buffer);
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.status).toBe(415);
  });

  it('rejects oversized body with 413', () => {
    const big = new ArrayBuffer(MAX_IMAGE_BYTES + 1);
    const result = validateImage(big);
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.status).toBe(413);
  });

  it('size check runs before format check', () => {
    // oversized garbage should give 413, not 415
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1).fill(0xAB);
    const result = validateImage(big.buffer);
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.status).toBe(413);
  });
});

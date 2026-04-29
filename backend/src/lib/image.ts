export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Magic-byte signatures for accepted image formats
const SIGNATURES: Array<{ bytes: number[]; type: string; ext: string }> = [
  { bytes: [0xff, 0xd8, 0xff],             type: 'image/jpeg', ext: '.jpg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47],       type: 'image/png',  ext: '.png' },
  { bytes: [0x52, 0x49, 0x46, 0x46],       type: 'image/webp', ext: '.webp' }, // RIFF header
];

/**
 * Validate size and detect image format from magic bytes.
 * Returns { type, ext } on success, or an error string on failure.
 */
export function validateImage(
  buf: ArrayBuffer,
): { type: string; ext: string } | { error: string; status: 413 | 415 } {
  if (buf.byteLength > MAX_IMAGE_BYTES) {
    return { error: 'Image exceeds 5 MB limit', status: 413 };
  }

  const view = new Uint8Array(buf, 0, Math.min(buf.byteLength, 12));

  for (const sig of SIGNATURES) {
    if (!sig.bytes.every((b, i) => view[i] === b)) continue;

    // WebP: RIFF header at 0, WEBP marker at 8
    if (sig.type === 'image/webp') {
      if (buf.byteLength < 12) continue;
      const webp = [0x57, 0x45, 0x42, 0x50];
      if (!webp.every((b, i) => view[8 + i] === b)) continue;
    }

    return { type: sig.type, ext: sig.ext };
  }

  return { error: 'Unsupported image format. Use JPEG, PNG, or WebP.', status: 415 };
}

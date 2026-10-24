// The compiler reports UTF-8 byte offsets; the editor (and JS strings) use
// UTF-16 code units. This module converts between them exactly.

export class OffsetMap {
  private byteToUtf16: Int32Array;

  constructor(public readonly text: string) {
    const bytes = new TextEncoder().encode(text);
    this.byteToUtf16 = new Int32Array(bytes.length + 1);
    let u16 = 0;
    let b = 0;
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      const nBytes = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
      for (let k = 0; k < nBytes; k++) this.byteToUtf16[b + k] = u16;
      b += nBytes;
      u16 += ch.length;
    }
    this.byteToUtf16[b] = u16;
  }

  /** UTF-16 index for a UTF-8 byte offset (clamped to the text). */
  toUtf16(byteOffset: number): number {
    if (byteOffset <= 0) return 0;
    if (byteOffset >= this.byteToUtf16.length) return this.text.length;
    return this.byteToUtf16[byteOffset];
  }
}

export function formatPos(p: { line: number; column: number }): string {
  return `${p.line}:${p.column}`;
}

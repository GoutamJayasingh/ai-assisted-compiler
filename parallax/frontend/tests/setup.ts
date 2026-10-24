import "@testing-library/jest-dom/vitest";

// jsdom does not implement layout; CodeMirror only needs these to exist.
const emptyRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
const zeroRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON() {} }) as DOMRect;
Range.prototype.getClientRects = emptyRects;
Range.prototype.getBoundingClientRect = zeroRect;

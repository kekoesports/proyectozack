// Next.js server startup hook — runs once before any request handler.
// Belt-and-suspenders DOMMatrix polyfill (primary polyfill is in pdf.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const g = globalThis as Record<string, unknown>;
    if (typeof g['DOMMatrix'] === 'undefined') {
      // Minimal stub — pdfjs-dist 5.x references DOMMatrix at module init
      // but never calls it during text-only extraction.
      g['DOMMatrix'] = class DOMMatrixStub {
        a=1;b=0;c=0;d=1;e=0;f=0;
        is2D=true;isIdentity=true;
        constructor(_init?: string | number[]) {}
        static fromMatrix() { return new DOMMatrixStub(); }
        static fromFloat32Array(_a: Float32Array) { return new DOMMatrixStub(); }
        static fromFloat64Array(_a: Float64Array) { return new DOMMatrixStub(); }
        multiply() { return this; }
        inverse() { return this; }
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
        toFloat32Array() { return new Float32Array(16); }
        toFloat64Array() { return new Float64Array(16); }
        toJSON() { return {}; }
        toString() { return 'matrix(1, 0, 0, 1, 0, 0)'; }
        transformPoint(): DOMPoint { return DOMPoint.fromPoint({ x:0,y:0,z:0,w:1 }); }
      };
    }
  }
}

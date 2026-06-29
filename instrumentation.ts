// instrumentation.ts — Next.js server startup hook.
// Runs once before any request handler; safe place for global polyfills.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // pdfjs-dist 5.x references DOMMatrix at module init even in the legacy
    // (Node.js) build. It only uses DOMMatrix for canvas rendering; our usage
    // is text-only extraction so the real implementation is never called.
    if (typeof globalThis.DOMMatrix === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        m11 = 1; m12 = 0; m13 = 0; m14 = 0;
        m21 = 0; m22 = 1; m23 = 0; m24 = 0;
        m31 = 0; m32 = 0; m33 = 1; m34 = 0;
        m41 = 0; m42 = 0; m43 = 0; m44 = 1;
        is2D = true; isIdentity = true;
        constructor(_init?: string | number[]) {}
        static fromMatrix(_m?: DOMMatrixInit) { return new (globalThis as any).DOMMatrix(); }
        static fromFloat32Array(_a: Float32Array) { return new (globalThis as any).DOMMatrix(); }
        static fromFloat64Array(_a: Float64Array) { return new (globalThis as any).DOMMatrix(); }
        multiply(_m?: DOMMatrixInit) { return this; }
        inverse() { return this; }
        translate(_tx?: number, _ty?: number, _tz?: number) { return this; }
        scale(_sx?: number, _sy?: number, _sz?: number, _ox?: number, _oy?: number, _oz?: number) { return this; }
        rotate(_rx?: number, _ry?: number, _rz?: number) { return this; }
        toFloat32Array() { return new Float32Array(16); }
        toFloat64Array() { return new Float64Array(16); }
        toJSON() { return {}; }
        toString() { return 'matrix(1, 0, 0, 1, 0, 0)'; }
        transformPoint(_p?: DOMPointInit): DOMPoint { return { x: 0, y: 0, z: 0, w: 1, toJSON: () => ({}) } as DOMPoint; }
      };
    }
  }
}

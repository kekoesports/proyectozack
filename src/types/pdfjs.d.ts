// pdfjs-dist does not ship type declarations for its legacy worker bundle.
// This module is imported via dynamic import() so Vercel NFT includes the file
// and sets globalThis.pdfjsWorker.WorkerMessageHandler at runtime.
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';

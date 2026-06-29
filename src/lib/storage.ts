// src/lib/storage.ts
// Decisión #3: Vercel Blob directo. NO LocalFileStorage. NO adapter pattern.
// Requiere BLOB_READ_WRITE_TOKEN en .env.local

import { put, del } from '@vercel/blob';

export type UploadResult = {
  url: string;
  pathname: string;
  size: number;
};

export async function uploadFile(input: {
  name: string;
  data: Blob | Buffer | ArrayBuffer;
  contentType: string;
}): Promise<UploadResult> {
  const blob = await put(input.name, input.data, {
    access: 'private',
    contentType: input.contentType,
  });
  const size =
    input.data instanceof Blob
      ? input.data.size
      : input.data instanceof ArrayBuffer
        ? input.data.byteLength
        : input.data.length;
  return {
    url: blob.url,
    pathname: blob.pathname,
    size,
  };
}

export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

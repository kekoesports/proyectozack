'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';

type Props = {
  readonly label?: string;
  readonly accept?: string;
  readonly disabled?: boolean;
  readonly onFile: (file: File) => void | Promise<void>;
  readonly children?: ReactNode;
};

export function FileUploadButton({
  label = 'Subir archivo',
  accept = '.pdf,.csv,.xlsx,.png,.jpg',
  disabled = false,
  onFile,
  children,
}: Props): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onFile(file);
    } finally {
      setUploading(false);
      // Reset so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
        disabled={disabled || uploading}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
      >
        <Upload size={14} />
        {uploading ? 'Subiendo...' : (children ?? label)}
      </button>
    </>
  );
}

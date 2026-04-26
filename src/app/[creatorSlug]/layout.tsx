import type { ReactNode } from 'react';

export default function CreatorRootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="min-h-screen bg-sp-black text-white font-sans">
      <div className="relative z-10">{children}</div>
    </div>
  );
}

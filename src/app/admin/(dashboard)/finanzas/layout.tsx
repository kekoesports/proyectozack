import type { ReactNode } from 'react';
import { FinanzasNav } from './FinanzasNav';

export default function FinanzasLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="space-y-5">
      <FinanzasNav />
      {children}
    </div>
  );
}

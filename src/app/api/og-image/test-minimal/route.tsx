import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export function GET() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', background: '#f5632a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'white', fontSize: 72, fontWeight: 900 }}>OK</span>
    </div>,
    { width: 1200, height: 630 },
  );
}

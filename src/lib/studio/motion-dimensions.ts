import type { StudioBoard } from '@/lib/schemas/studio-production';
export const motionDimensions = { '9:16': [720, 1280], '1:1': [720, 720], '16:9': [1280, 720] } satisfies Record<StudioBoard['format'], [number, number]>;

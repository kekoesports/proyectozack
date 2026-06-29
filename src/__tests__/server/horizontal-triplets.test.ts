import { parseHorizontalTriplets } from '@/lib/parsers/horizontal-triplets';

// TC1 — Layout KEYDROP completo: 3 grupos, 2 filas de datos
const KEYDROP_GRID: string[][] = [
  // Fila de cabecera (descartada por el scanner, no tiene triplets válidos)
  ['Dedicated video', 'nº', 'LINK', 'Preroll', 'nº', 'LINK', 'Stream', 'nº', 'LINK'],
  // Fila 1 de datos
  [
    'Dedicated video 1', '1', 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
    'Preroll 1',          '1', 'https://twitch.tv/videos/1111111111',
    'Stream 1',           '1', 'https://twitch.tv/videos/9999999999',
  ],
  // Fila 2 de datos
  [
    'Dedicated video 2', '2', 'https://www.youtube.com/watch?v=bbbbbbbbbbb',
    'Preroll 2',          '2', 'https://twitch.tv/videos/2222222222',
    'Stream 2',           '2', 'https://twitch.tv/videos/8888888888',
  ],
];

describe('parseHorizontalTriplets', () => {
  describe('TC1 — KEYDROP layout completo (3 grupos × 2 filas)', () => {
    const links = parseHorizontalTriplets(KEYDROP_GRID);

    it('devuelve 6 links', () => {
      expect(links).toHaveLength(6);
    });

    it('asigna subtype dedicated_video a URLs de YouTube', () => {
      const yt = links.filter((l) => l.subtype === 'dedicated_video');
      expect(yt).toHaveLength(2);
      expect(yt.every((l) => l.originalUrl.includes('youtube.com'))).toBe(true);
    });

    it('asigna subtype preroll a los prerolls de Twitch', () => {
      const pr = links.filter((l) => l.subtype === 'preroll');
      expect(pr).toHaveLength(2);
      expect(pr.every((l) => l.originalUrl.includes('twitch.tv'))).toBe(true);
    });

    it('asigna subtype stream a los streams de Twitch', () => {
      const st = links.filter((l) => l.subtype === 'stream');
      expect(st).toHaveLength(2);
    });
  });

  // TC2 — Celda URL vacía no produce link
  describe('TC2 — Celdas URL vacías se omiten', () => {
    const grid: string[][] = [
      ['Preroll 1', '1', 'https://twitch.tv/videos/111'],
      ['Preroll 2', '2', ''],          // URL vacía → no link
      ['Preroll 3', '3', 'https://twitch.tv/videos/333'],
    ];

    it('solo incluye filas con URL válida', () => {
      const links = parseHorizontalTriplets(grid);
      expect(links).toHaveLength(2);
      expect(links.every((l) => l.originalUrl !== '')).toBe(true);
    });
  });

  // TC3 — Un solo grupo de columnas
  describe('TC3 — Un único grupo (Stream)', () => {
    const grid: string[][] = [
      ['Stream 1', '1', 'https://twitch.tv/videos/aaa'],
      ['Stream 2', '2', 'https://twitch.tv/videos/bbb'],
    ];

    it('detecta 2 links con subtype stream', () => {
      const links = parseHorizontalTriplets(grid);
      expect(links).toHaveLength(2);
      expect(links.every((l) => l.subtype === 'stream')).toBe(true);
    });
  });

  // TC4 — Label no reconocido → subtype null
  describe('TC4 — Label desconocido produce subtype null', () => {
    const grid: string[][] = [
      ['Podcast 1', '1', 'https://open.spotify.com/episode/abc'],
    ];

    it('subtype es null para label desconocido', () => {
      const links = parseHorizontalTriplets(grid);
      expect(links).toHaveLength(1);
      expect(links[0]?.subtype).toBeNull();
    });
  });

  // TC5 — Grilla sin triplets válidos → array vacío
  describe('TC5 — Sin triplets válidos', () => {
    const grid: string[][] = [
      ['', '', ''],
      ['solo texto', 'sin_numero', 'sin_url'],
    ];

    it('devuelve array vacío', () => {
      const links = parseHorizontalTriplets(grid);
      expect(links).toHaveLength(0);
    });
  });

  // TC6 — Labels variantes: "Livestream", "Dedicated Video" (mayúsculas)
  describe('TC6 — Variantes de labels', () => {
    const grid: string[][] = [
      ['Dedicated Video 1', '1', 'https://www.youtube.com/watch?v=ccccccccccc'],
      ['Livestream 1',      '1', 'https://twitch.tv/videos/555'],
    ];

    it('Dedicated Video → dedicated_video', () => {
      const links = parseHorizontalTriplets(grid);
      const video = links.find((l) => l.originalUrl.includes('youtube'));
      expect(video?.subtype).toBe('dedicated_video');
    });

    it('Livestream → stream', () => {
      const links = parseHorizontalTriplets(grid);
      const stream = links.find((l) => l.originalUrl.includes('twitch'));
      expect(stream?.subtype).toBe('stream');
    });
  });

  // TC7 — KEYDROP TODOCS2: 5 columnas de prefijo + 3 grupos de triplets
  describe('TC7 — Layout Deal #5 con 5 columnas de prefijo (TODOCS2)', () => {
    // Reproduce el layout real: columnas de metadata antes de los triplets
    const TODOCS2_GRID: string[][] = [
      // Cabecera: nº no es dígito → no produce links
      ['Talento', 'Brand', 'Deal', 'Fecha', '',
       'Dedicated video', 'nº', 'LINK',
       'Preroll',         'nº', 'LINK',
       'Stream',          'nº', 'LINK'],
      // Fila 1: 5 prefijos no-triplet, luego 3 grupos
      ['KEYDROP', 'Brand X', 'TODOCS2', '2026-06', '',
       'Dedicated video 1', '1', 'https://www.youtube.com/watch?v=todocs2vid01',
       'Preroll 1',         '1', 'https://twitch.tv/videos/1111111111',
       'Stream 1',          '1', 'https://twitch.tv/videos/9999999999'],
      // Fila 2: prefijos vacíos
      ['', '', '', '', '',
       'Dedicated video 2', '2', 'https://www.youtube.com/watch?v=todocs2vid02',
       'Preroll 2',         '2', 'https://twitch.tv/videos/2222222222',
       'Stream 2',          '2', 'https://twitch.tv/videos/8888888888'],
    ];

    const links = parseHorizontalTriplets(TODOCS2_GRID);

    it('detecta 6 links (2 filas × 3 grupos)', () => {
      expect(links).toHaveLength(6);
    });

    it('asigna dedicated_video a las 2 URLs de YouTube', () => {
      const yt = links.filter((l) => l.subtype === 'dedicated_video');
      expect(yt).toHaveLength(2);
      expect(yt.every((l) => l.originalUrl.includes('youtube.com'))).toBe(true);
    });

    it('asigna preroll a los 2 links de Preroll', () => {
      expect(links.filter((l) => l.subtype === 'preroll')).toHaveLength(2);
    });

    it('asigna stream a los 2 links de Stream', () => {
      expect(links.filter((l) => l.subtype === 'stream')).toHaveLength(2);
    });

    it('la cabecera no produce links (nº no es dígito)', () => {
      // La cabecera está en rowIndex 0; ningún link debe venir de ahí
      expect(links.every((l) => l.rowIndex !== 0)).toBe(true);
    });
  });

  // TC8 — Celdas URL con texto de display (=HYPERLINK en Sheets → devuelve "Video 1")
  // Documenta que el parser no puede recuperar URLs de fórmulas HYPERLINK con FORMATTED_VALUE.
  describe('TC8 — Celda URL con texto de display (HYPERLINK formula)', () => {
    const grid: string[][] = [
      ['Dedicated video 1', '1', 'Video 1'],
      ['Preroll 1',         '1', 'Preroll video'],
      ['Stream 1',          '1', 'Stream en vivo'],
    ];

    it('no detecta links cuando las celdas URL contienen texto display en lugar de URL', () => {
      const links = parseHorizontalTriplets(grid);
      expect(links).toHaveLength(0);
    });
  });
});

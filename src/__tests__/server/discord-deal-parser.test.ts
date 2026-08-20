/**
 * Parser de mensajes de #pipeline-deals.
 *
 * El caso base es el mensaje real que se publicó en el canal, con las dos
 * trampas que traía: una fecha que no existe (30/02/2027) y un placeholder de
 * plantilla sin rellenar (@HANDLE_EXACTO).
 */

import { parseDiscordDealMessage, parseSpanishDate } from '@/lib/parsers/discordDeal';
import { AutomationDealCreate } from '@/lib/schemas/automationDeal';

const MENSAJE_REAL = `NUEVO DEAL

Creador: The Real Fer
Handle: @HANDLE_EXACTO
Marca: SkinsMonkey
Estado: aprobada
Moneda: EUR

Importe marca total: 12000
Pago creador total: 5000
Producto: 0
Sorteos: 0

Fecha de inicio: 20/08/2026
Fecha de finalización: 30/02/2027

Entregables:
- Preroll YouTube: 30
- Vídeo dedicado YouTube: 2

Cadencia:
- 5 prerolls al mes durante 6 meses

Notas:
- Sin streams.`;

const MENSAJE_COMPLETO = MENSAJE_REAL
  .replace('@HANDLE_EXACTO', '@thereelfer')
  .replace('30/02/2027', '30/12/2026');

describe('parseSpanishDate', () => {
  it('convierte dd/mm/yyyy a ISO', () => {
    expect(parseSpanishDate('20/08/2026')).toEqual({ iso: '2026-08-20', invalid: false });
    expect(parseSpanishDate('1/1/2027')).toEqual({ iso: '2027-01-01', invalid: false });
  });

  it('rechaza el 30 de febrero en vez de correrlo a marzo', () => {
    // new Date(2027, 1, 30) devolvería el 2 de marzo sin avisar.
    expect(parseSpanishDate('30/02/2027')).toEqual({ iso: null, invalid: true });
  });

  it('distingue años bisiestos', () => {
    expect(parseSpanishDate('29/02/2028').iso).toBe('2028-02-29'); // bisiesto
    expect(parseSpanishDate('29/02/2027').invalid).toBe(true); // no lo es
    expect(parseSpanishDate('29/02/2100').invalid).toBe(true); // secular no bisiesto
    expect(parseSpanishDate('29/02/2000').iso).toBe('2000-02-29'); // secular bisiesto
  });

  it('rechaza días y meses fuera de rango', () => {
    expect(parseSpanishDate('32/01/2026').invalid).toBe(true);
    expect(parseSpanishDate('01/13/2026').invalid).toBe(true);
    expect(parseSpanishDate('00/01/2026').invalid).toBe(true);
  });

  it('trata la ausencia de fecha como ausencia, no como error', () => {
    expect(parseSpanishDate(null)).toEqual({ iso: null, invalid: false });
  });

  it('marca como inválido lo que no tiene forma de fecha', () => {
    expect(parseSpanishDate('la semana que viene').invalid).toBe(true);
  });
});

describe('parseDiscordDealMessage — mensaje real con trampas', () => {
  const result = parseDiscordDealMessage(MENSAJE_REAL);

  it('lo reconoce como trato', () => {
    expect(result.looksLikeDeal).toBe(true);
  });

  it('NO acepta la fecha imposible ni la corre a marzo', () => {
    expect(result.proposedDeal.endDate).toBeUndefined();
    expect(result.warnings.join(' ')).toMatch(/finalizaci[oó]n no es una fecha v[aá]lida/i);
  });

  it('trata @HANDLE_EXACTO como campo vacío, no como handle', () => {
    const talent = result.proposedDeal.talent as Record<string, unknown> | undefined;
    expect(talent?.handle).toBeUndefined();
    expect(result.warnings.join(' ')).toMatch(/handle/i);
  });

  it('deriva el nombre del trato como "Marca x Creador"', () => {
    expect(result.proposedDeal.name).toBe('SkinsMonkey x The Real Fer');
  });

  it('mapea los importes a sus campos, incluidos producto y sorteos', () => {
    expect(result.proposedDeal.amountBrand).toBe(12000);
    expect(result.proposedDeal.amountTalent).toBe(5000);
    expect(result.proposedDeal.amountInKindTalent).toBe(0);
    expect(result.proposedDeal.amountInKindCommunity).toBe(0);
  });

  it('clasifica los entregables y conserva la etiqueta original', () => {
    expect(result.proposedDeal.deliverables).toEqual([
      { type: 'preroll', targetCount: 30, notes: 'Preroll YouTube' },
      { type: 'video_youtube', targetCount: 2, notes: 'Vídeo dedicado YouTube' },
    ]);
  });

  it('deduce la plataforma a partir de los entregables', () => {
    const talent = result.proposedDeal.talent as Record<string, unknown>;
    expect(talent.platform).toBe('youtube');
  });

  it('recoge cadencia y notas', () => {
    expect(result.proposedDeal.notes).toBe('Cadencia: 5 prerolls al mes durante 6 meses\nSin streams.');
  });

  it('al faltarle handle y fecha, NO valida como trato completo', () => {
    // Es lo que hace que el borrador aterrice como missing_info y lo revise alguien.
    expect(AutomationDealCreate.safeParse(result.proposedDeal).success).toBe(false);
  });
});

describe('parseDiscordDealMessage — mensaje correcto', () => {
  const result = parseDiscordDealMessage(MENSAJE_COMPLETO);

  it('no deja avisos', () => {
    expect(result.warnings).toEqual([]);
  });

  it('valida contra AutomationDealCreate', () => {
    const parsed = AutomationDealCreate.safeParse(result.proposedDeal);
    expect(parsed.success).toBe(true);
  });

  it('normaliza el handle quitando la arroba', () => {
    const talent = result.proposedDeal.talent as Record<string, unknown>;
    expect(talent.handle).toBe('thereelfer');
  });
});

describe('parseDiscordDealMessage — casos sueltos', () => {
  it('descarta lo que no es un trato', () => {
    const r = parseDiscordDealMessage('buenas, alguien ha visto el informe?');
    expect(r.looksLikeDeal).toBe(false);
    expect(r.proposedDeal).toEqual({});
  });

  it('avisa cuando no hay entregables en vez de inventarlos', () => {
    const r = parseDiscordDealMessage('NUEVO DEAL\n\nCreador: X\nMarca: Y\n');
    expect(r.proposedDeal.deliverables).toBeUndefined();
    expect(r.warnings.join(' ')).toMatch(/entregable/i);
  });

  it('entiende importes con separadores de miles y símbolo', () => {
    const r = parseDiscordDealMessage(
      'NUEVO DEAL\nCreador: A\nMarca: B\nImporte marca total: 12.000 €\nPago creador total: 1,500.50\n',
    );
    expect(r.proposedDeal.amountBrand).toBe(12000);
    expect(r.proposedDeal.amountTalent).toBe(1500.5);
  });

  it('distingue importe ausente de importe cero', () => {
    const r = parseDiscordDealMessage('NUEVO DEAL\nCreador: A\nMarca: B\nProducto: 0\n');
    expect(r.proposedDeal.amountInKindTalent).toBe(0);
    expect(r.proposedDeal.amountBrand).toBeUndefined();
  });

  it('avisa si el pago al creador supera el de la marca', () => {
    const r = parseDiscordDealMessage(
      'NUEVO DEAL\nCreador: A\nMarca: B\nImporte marca total: 100\nPago creador total: 500\n',
    );
    expect(r.warnings.join(' ')).toMatch(/supera el importe de la marca/i);
  });

  it('avisa si la fecha de fin es anterior a la de inicio', () => {
    const r = parseDiscordDealMessage(
      'NUEVO DEAL\nCreador: A\nMarca: B\nFecha de inicio: 10/05/2026\nFecha de finalización: 01/05/2026\n',
    );
    expect(r.warnings.join(' ')).toMatch(/anterior a la de inicio/i);
  });

  it('no acepta un estado inventado', () => {
    const r = parseDiscordDealMessage('NUEVO DEAL\nCreador: A\nMarca: B\nEstado: casi hecho\n');
    expect(r.proposedDeal.status).toBeUndefined();
    expect(r.warnings.join(' ')).toMatch(/estado no reconocido/i);
  });

  it('tolera acentos y mayúsculas en las etiquetas', () => {
    const r = parseDiscordDealMessage('NUEVO DEAL\nCREADOR: A\nMARCA: B\nMONEDA: usd\n');
    expect(r.proposedDeal.currency).toBe('USD');
  });

  it('trata otros placeholders de plantilla como vacío', () => {
    for (const ph of ['TBD', 'pendiente', 'N/A', 'NOMBRE_MARCA', '---']) {
      const r = parseDiscordDealMessage(`NUEVO DEAL\nCreador: A\nMarca: B\nHandle: ${ph}\n`);
      const talent = r.proposedDeal.talent as Record<string, unknown>;
      expect(talent.handle).toBeUndefined();
    }
  });

  it('clasifica integraciones de stream y deduce twitch', () => {
    const r = parseDiscordDealMessage(
      'NUEVO DEAL\nCreador: A\nMarca: B\n\nEntregables:\n- Integración en directo: 4\n',
    );
    expect(r.proposedDeal.deliverables).toEqual([
      { type: 'stream_integration', targetCount: 4, notes: 'Integración en directo' },
    ]);
    const talent = r.proposedDeal.talent as Record<string, unknown>;
    expect(talent.platform).toBe('twitch');
  });

  it('cae en "otro" cuando la etiqueta no encaja, sin perder la cantidad', () => {
    const r = parseDiscordDealMessage(
      'NUEVO DEAL\nCreador: A\nMarca: B\n\nEntregables:\n- Aparición en podcast: 3\n',
    );
    expect(r.proposedDeal.deliverables).toEqual([
      { type: 'otro', targetCount: 3, notes: 'Aparición en podcast' },
    ]);
  });
});

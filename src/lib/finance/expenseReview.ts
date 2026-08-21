'server-only';

/**
 * FV.5 — pasa los gastos ya registrados por el validador.
 *
 * El asistente de tres pasos vive en el formulario, pero antes de que exista
 * hace falta saber qué facturas de las que YA están tienen algo que revisar:
 * son 119 gastos de 2026 y nadie los va a repasar a mano.
 */

import { and, eq, gte, lte, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoices } from '@/db/schema';
import { getPerfilesFiscales } from './expenseAssistant';
import {
  calcularEfecto,
  etiquetaDeducibilidad,
  evaluarGasto,
  type AvisoGasto,
  type BorradorGasto,
  type Deducibilidad,
  type EfectoGasto,
} from './expenseAssistant.shared';

export type GastoRevisado = {
  readonly id: number;
  readonly issueDate: string;
  readonly concept: string;
  readonly counterpartyName: string | null;
  readonly totalAmount: number;
  readonly currency: string;
  /** El mismo importe en euros. Igual a `totalAmount` en las filas en euros. */
  readonly totalEur: number;
  readonly talentId: number | null;
  readonly avisos: readonly AvisoGasto[];
  readonly deducibilidad: Deducibilidad;
  readonly efecto: EfectoGasto;
};

export type PagoSinFicha = {
  readonly id: number;
  readonly issueDate: string;
  readonly concept: string;
  readonly counterpartyName: string | null;
  readonly totalEur: number;
  readonly currency: string;
};

export type RevisionGastos = {
  readonly period: { readonly from: string; readonly to: string };
  readonly total: number;
  /** Gastos con una contradicción concreta que mirar. */
  readonly conAvisos: readonly GastoRevisado[];
  /**
   * Gastos que no se pueden validar porque al talento le falta el perfil.
   *
   * Van aparte y solo se cuentan: son decenas de facturas con el mismo aviso, y
   * repetirlo tantas veces esconde los avisos que sí dicen algo. La acción no es
   * revisar factura por factura, sino rellenar unas pocas fichas.
   */
  readonly sinValidar: { readonly gastos: number; readonly talentos: number };
  /**
   * Pagos a talento que no apuntan a ninguna ficha (`talent_id` vacío).
   *
   * No es lo mismo que el bucket de arriba: ahí el talento existe y le falta un
   * campo; aquí no hay a quién mirar, así que el validador no puede decir nada
   * de la retención por mucho perfil que se rellene. Se arregla vinculando la
   * factura, y hasta entonces esos importes quedan fuera de toda comprobación.
   */
  readonly sinTalento: {
    readonly gastos: number;
    readonly importe: number;
    /** Los propios pagos, para poder abrirlos y vincularlos uno a uno. */
    readonly filas: readonly PagoSinFicha[];
  };
  /**
   * Avisos contados por nivel.
   *
   * `error` sale siempre a cero y NO significa que ningún gasto tenga un
   * problema de deducibilidad: los dos únicos disparadores de ese nivel son que
   * la factura vaya a nombre personal o no traiga NIF, y ninguno de los dos se
   * guarda en `invoices`. Sobre un gasto ya registrado esa comprobación no se
   * hace — hará falta leer el PDF (FV.0). Quien pinte esto no debe rotularlo
   * como "sin errores", sino como no comprobado.
   */
  readonly resumen: Readonly<Record<'error' | 'aviso' | 'info', number>>;
};

/**
 * Avisos que solo dicen "no tengo el dato", no "esto está mal".
 *
 * Los tres piden rellenar algo distinto — la ficha entera, el tipo fiscal o la
 * sección del IAE — y por eso son códigos separados: una pantalla que agrupe
 * por código no debe fundir tres tareas en una sola línea.
 */
const CODIGOS_SIN_DATO = new Set(['sin-perfil', 'falta-tipo-fiscal', 'perfil-incompleto']);

/**
 * Todos los gastos del periodo pasados por el validador, devolviendo solo los
 * que tienen algo que decir.
 *
 * Los perfiles se leen de una vez para todos los talentos implicados, no uno
 * por fila.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function revisarGastos(period: {
  readonly from: string;
  readonly to: string;
}): Promise<RevisionGastos> {
  const rows = await db
    .select({
      id: invoices.id,
      issueDate: invoices.issueDate,
      concept: invoices.concept,
      counterpartyName: invoices.counterpartyName,
      netAmount: invoices.netAmount,
      vatPct: invoices.vatPct,
      withholdingPct: invoices.withholdingPct,
      totalAmount: invoices.totalAmount,
      currency: invoices.currency,
      eurEquivalent: invoices.eurEquivalent,
      talentId: invoices.talentId,
      expenseSubtype: invoices.expenseSubtype,
      notes: invoices.notes,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.kind, 'expense'),
        ne(invoices.status, 'anulada'),
        gte(invoices.issueDate, period.from),
        lte(invoices.issueDate, period.to),
      ),
    );

  const talentIds = [...new Set(rows.map((r) => r.talentId).filter((id): id is number => id !== null))];
  const perfiles = await getPerfilesFiscales(talentIds);

  const revisados: GastoRevisado[] = [];
  const resumen = { error: 0, aviso: 0, info: 0 };
  let gastosSinValidar = 0;
  const talentosSinValidar = new Set<number>();
  let importeSinTalento = 0;
  const filasSinTalento: PagoSinFicha[] = [];

  for (const row of rows) {
    const borrador: BorradorGasto = {
      netAmount: Number(row.netAmount),
      vatPct: Number(row.vatPct),
      withholdingPct: Number(row.withholdingPct),
      currency: row.currency,
      counterpartyName: row.counterpartyName,
      concept: row.concept,
      // Un gasto ya registrado no guarda el NIF de la factura ni si venía a
      // nombre personal: eso lo sabrá el asistente cuando lea el PDF (FV.0).
      // Hasta entonces no se inventa el dato — se asume correcto y el aviso de
      // "no deducible" solo saltará en el formulario, con el papel delante.
      nifEnFactura: 'sin-verificar',
      aNombrePersonal: false,
      mesesDeServicio: null,
      expenseSubtype: row.expenseSubtype,
    };

    const perfil = row.talentId !== null ? (perfiles.get(row.talentId) ?? null) : null;
    const avisos = evaluarGasto(borrador, perfil);
    if (avisos.length === 0) continue;

    // Si lo único que pasa es que falta el perfil, no se lista: se cuenta. La
    // acción es rellenar la ficha del talento, no abrir la factura.
    if (avisos.every((a) => CODIGOS_SIN_DATO.has(a.codigo) || a.nivel === 'info')) {
      if (avisos.some((a) => CODIGOS_SIN_DATO.has(a.codigo))) {
        // Dos causas distintas para el mismo silencio del validador: o la
        // factura no apunta a ninguna ficha, o la ficha existe y está a medias.
        // La primera se arregla en la factura y la segunda en el talento, así
        // que contarlas juntas manda a corregir al sitio equivocado.
        if (row.talentId === null) {
          // En euros, no en la moneda de la factura: dos de estos pagos están
          // en dólares y sumarlos a pelo daba un total que no es dinero de
          // ninguna divisa. `eurEquivalent` lo fijó FV.4 al tipo BCE del día.
          importeSinTalento += Number(row.eurEquivalent ?? row.totalAmount);
          filasSinTalento.push({
            id: row.id,
            issueDate: row.issueDate,
            concept: row.concept,
            counterpartyName: row.counterpartyName,
            totalEur: Number(row.eurEquivalent ?? row.totalAmount),
            currency: row.currency,
          });
        } else {
          gastosSinValidar += 1;
          talentosSinValidar.add(row.talentId);
        }
      }
      // Los `info` solos tampoco se listan: la inversión del sujeto pasivo es
      // correcta y sale en 32 facturas. Un listado que las incluya entierra el
      // único aviso que sí pide acción.
      for (const a of avisos) resumen[a.nivel] += 1;
      continue;
    }

    for (const a of avisos) resumen[a.nivel] += 1;
    const { nivel, ivaDeducible } = etiquetaDeducibilidad(borrador, avisos);

    revisados.push({
      id: row.id,
      issueDate: row.issueDate,
      concept: row.concept,
      counterpartyName: row.counterpartyName,
      totalAmount: Number(row.totalAmount),
      currency: row.currency,
      totalEur: Number(row.eurEquivalent ?? row.totalAmount),
      talentId: row.talentId,
      avisos,
      deducibilidad: nivel,
      efecto: calcularEfecto(borrador, ivaDeducible),
    });
  }

  // Lo que bloquea la deducción primero; dentro, lo más caro arriba — en euros,
  // porque una factura de 1.590 $ no es más cara que una de 1.400 €.
  const peso = (g: GastoRevisado): number =>
    g.avisos.some((a) => a.nivel === 'error') ? 0 : g.avisos.some((a) => a.nivel === 'aviso') ? 1 : 2;

  revisados.sort((a, b) => peso(a) - peso(b) || b.totalEur - a.totalEur);

  return {
    period,
    total: rows.length,
    conAvisos: revisados,
    sinValidar: { gastos: gastosSinValidar, talentos: talentosSinValidar.size },
    sinTalento: {
      gastos: filasSinTalento.length,
      importe: Math.round(importeSinTalento * 100) / 100,
      filas: [...filasSinTalento].sort((a, b) => b.totalEur - a.totalEur),
    },
    resumen,
  };
}

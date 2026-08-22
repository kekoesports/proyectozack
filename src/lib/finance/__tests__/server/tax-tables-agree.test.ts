/**
 * Los porcentajes de IRPF viven en dos sitios y tienen que decir lo mismo.
 *
 * `IRPF_POR_PERFIL` (validador de gastos) e `IRPF_BY_TAX_TYPE` (formulario de
 * compliance) son tablas paralelas: una decide si una factura lleva la
 * retención correcta, la otra le dice al operador qué porcentaje toca. Añadir
 * un perfil a una y no a la otra las separa en silencio — el formulario ofrece
 * un tipo que el validador no sabe evaluar, o al revés.
 *
 * Fusionarlas obligaría a que el schema de compliance importe del módulo de
 * finanzas o al contrario, y ninguna de las dos dependencias es sana. Esta
 * comprobación es más barata que el acoplamiento.
 */

import { IRPF_POR_PERFIL } from '@/lib/finance/expenseAssistant.shared';
import { IRPF_BY_TAX_TYPE, TALENT_TAX_TYPES } from '@/lib/schemas/talentCompliance';

describe('[FV.5] las dos tablas de IRPF no divergen', () => {
  it('cubren exactamente los mismos perfiles', () => {
    expect(Object.keys(IRPF_POR_PERFIL).sort()).toEqual(Object.keys(IRPF_BY_TAX_TYPE).sort());
  });

  it('asignan el mismo porcentaje a cada perfil', () => {
    expect({ ...IRPF_POR_PERFIL }).toEqual({ ...IRPF_BY_TAX_TYPE });
  });

  it('y ambas cubren todos los tipos que el formulario ofrece', () => {
    for (const t of TALENT_TAX_TYPES) {
      expect(IRPF_POR_PERFIL).toHaveProperty(t);
      expect(IRPF_BY_TAX_TYPE).toHaveProperty(t);
    }
  });
});

# Pull request

## Cambio

Describe qué cambia, por qué y cómo se ha verificado.

## Procedencia e IP

- **IP asset:** `SP-PRE-___`, `KP-IP-___` o `UNASSIGNED`
- **R&D project:** `SP-RD-___`, `KP-RD-___` o `N/A`
- **Procedencia:** `PRE-EXISTING` / `NEW` / `ACQUIRED` / `RELATED-PARTY` / `UNRELATED-THIRD-PARTY`

Selecciona la clasificación principal:

- [ ] Mantenimiento, soporte u operación rutinaria
- [ ] Mejora ordinaria de producto
- [ ] Candidato a I+D con incertidumbre técnica
- [ ] Documentación, datos o infraestructura

No marques I+D únicamente porque el cambio use IA, tenga muchos commits o
ahorre tiempo.

## Evidencia técnica

Si es candidato a I+D, completa:

- **Problema técnico:**
- **Incertidumbre técnica:**
- **Alternativas consideradas:**
- **Hipótesis/experimento:**
- **Resultado, incluidos fallos:**

Para el resto de cambios, indica `N/A`.

## Tiempo y costes

- **Referencia de time entry:**
- **Referencia de factura/coste:**
- **Uso:** `product_rnd` / `production` / `customer_delivery` / `internal_operations` / `marketing` / `testing` / `unallocated`

No estimes horas desde commits ni conviertas ahorro operativo en gasto.

## Verificación

- [ ] Tests relevantes
- [ ] Typecheck/lint cuando proceda
- [ ] Sin secretos ni datos personales innecesarios
- [ ] Migración aditiva y versionada, si existe
- [ ] Rollback o desactivación documentados
- [ ] Evidencia y clasificación no alteran registros históricos

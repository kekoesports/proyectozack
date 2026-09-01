---
summary: 'Política para registrar tiempo del fundador sin convertir horas no remuneradas en gasto ficticio.'
read_when:
  - Recording founder development time
  - Allocating payroll to R&D or software development
  - Preparing Spanish R&D deductions or Cyprus Nexus evidence
---

# Política de tiempo y coste del fundador

## Tres magnitudes distintas

| Magnitud | Utilidad | Base |
| --- | --- | --- |
| Horas de actividad | Procedencia, autoría y esfuerzo | Registro diario y evidencia |
| Valor sombra | Gestión y coste de reposición | Horas por tarifa de referencia |
| Coste real | Contabilidad y posible fiscalidad | Nómina/remuneración, cargas y pagos reales |

Las horas no remuneradas pueden acreditar creación y aumentar una estimación
económica, pero no se convierten automáticamente en gasto de la sociedad.

## Registro desde el 1 de septiembre de 2026

Cada día se registra el trabajo en **Zack Operaciones → Expediente IP**, con
entidad, proyecto, activo, actividad, minutos y evidencia. La plantilla
[`CONTEMPORANEOUS_TIME_LEDGER.csv`](./templates/CONTEMPORANEOUS_TIME_LEDGER.csv)
queda como formato de contingencia y exportación, no como un segundo registro
que deba mantenerse manualmente en paralelo.

Categorías:

```text
research
experimental_development
product_development
testing
maintenance
operations
security
sales_marketing
administration
training
```

`research` y `experimental_development` solo se proponen cuando existe una
incertidumbre técnica, hipótesis, experimento y resultado. CRUD rutinario,
configuración, contenido, correcciones, soporte y despliegues mecánicos no se
fuerzan dentro de I+D.

## Asignación del coste

La asignación mensual parte del coste real:

```text
eligible project cost = actual payroll cost including employer charges
                      x eligible project minutes
                      / total remunerated working minutes
```

Si la remuneración real fuese 1.000 EUR brutos al mes y el 40% del tiempo
remunerado correspondiera a un proyecto aceptado, la base preliminar sería 400
EUR más la proporción de cargas empresariales. No serían deducibles
`horas x tarifa de mercado` si esa remuneración no se devengó y contabilizó.

Cuando la cifra de 1.000 EUR sea neta, incluya funciones de administrador o no
cubra toda la jornada, el asesor debe reconstruir el coste empresarial real
antes de asignarlo.

## Remuneración futura

Para reflejar mejor el trabajo del fundador sin fabricar costes históricos:

1. revisar si actúa como administrador, trabajador, autónomo societario o una
   combinación jurídicamente válida;
2. comprobar que los estatutos permiten remunerar al administrador y aprobar
   la cuantía y conceptos en junta cuando corresponda;
3. fijar desde una fecha real una remuneración de mercado compatible con la
   tesorería;
4. documentar por separado las funciones ejecutivas y técnicas;
5. usar nómina, Seguridad Social, retenciones y contabilidad correctas;
6. valorar una retribución variable o diferida solo si se acuerda y devenga
   realmente, no como ajuste retroactivo.

Las operaciones entre socio y sociedad deben respetar valor de mercado y la
documentación aplicable.

## España antes de Chipre

El artículo 35 de la Ley del Impuesto sobre Sociedades exige gastos reales,
directamente relacionados, efectivamente aplicados e individualizados por
proyecto. Prevé, bajo sus condiciones:

- 25% para gasto de I+D y 42% sobre el exceso respecto de la media de los dos
  años anteriores;
- 17% adicional sobre personal investigador cualificado adscrito en exclusiva;
- 12% para innovación tecnológica.

La clasificación no es automática. Para reducir riesgo se prepara una memoria
técnica por proyecto y se valora solicitar informe motivado vinculante o un
acuerdo previo de valoración.

## Futura sociedad chipriota

El tipo corporativo chipriota es 15% desde 2026. La exención del 80% se aplica
al beneficio neto cualificado ajustado por Nexus; con Nexus del 100%, el efecto
matemático puede ser 3% sobre ese beneficio, no sobre toda la facturación.

El tiempo `PRE-CYPRUS` acredita procedencia y puede contribuir a una valoración,
pero no se convierte en gasto cualificado de una sociedad que todavía no
existía. La adquisición de IP y la subcontratación a partes vinculadas entran en
el gasto total del denominador Nexus, no en el gasto cualificado del numerador.

Cuando exista la sociedad chipriota, la estructura más sólida será que esta
entidad controle y soporte realmente el desarrollo futuro: personal contratado,
dirección técnica, riesgos, presupuesto, proyectos, costes e ingresos. Si el
fundador desarrolla desde Chipre como empleado o director remunerado, la parte
real de su coste asignada a I+D candidata puede formar parte del seguimiento,
sujeta a validación local.

## Controles

- Ningún agente aprueba elegibilidad fiscal.
- Ninguna hora crea por sí sola una nómina, factura o asiento.
- El ledger del CRM rechaza `UPDATE` y `DELETE`; las correcciones futuras se
  incorporarán como eventos separados sin destruir el original.
- Las horas históricas se marcan `reconstructed`.
- Las horas diarias introducidas al terminar el trabajo se marcan
  `contemporaneous`.
- Proyecto, activo, persona, minutos y evidencia son obligatorios.
- Cuando el titular o pagador no esté acreditado se registra como pendiente de
  revisión; nunca se selecciona una entidad por defecto para completar el formulario.

## Referencias

- [Ley del Impuesto sobre Sociedades, artículo 35](https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328)
- [Ley de Sociedades de Capital, artículo 217](https://www.boe.es/buscar/act.php?id=BOE-A-2010-10544)
- [ICAC, costes de intangibles generados internamente](https://www.boe.es/eli/es/res/2013/05/28/%281%29/con)
- [Ministerio de Finanzas de Chipre, IP income](https://www.gov.cy/mof/en/documents/tax-incentives/)
- [OCDE, Nexus y gasto cualificado](https://www.oecd.org/content/dam/oecd/en/topics/policy-sub-issues/harmful-tax-practices/beps-action-5-agreement-on-modified-nexus-approach-for-ip-regimes.pdf)

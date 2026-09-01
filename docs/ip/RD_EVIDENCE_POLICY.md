---
summary: 'Política para separar evidencia técnica, coste real, ahorro operativo e ingresos de IP.'
read_when:
  - Opening a technical PR
  - Recording development time or AI usage
  - Preparing R&D, Nexus or IP Box evidence
---

# Política de evidencia de I+D

## Cuatro categorías separadas

| Categoría | Qué demuestra | Qué no demuestra |
| --- | --- | --- |
| Evidencia técnica | Problema, incertidumbre, hipótesis, experimento y resultado | Gasto fiscal o propiedad jurídica |
| Coste real | Factura, nómina, pago y asignación directa | Que toda la actividad sea I+D elegible |
| Ahorro operativo | Tiempo/volumen antes y después, ROI y valor comercial | Gasto contable o ingreso IP |
| Ingreso atribuible | Factura, producto, licencia o metodología de embedded income | Elegibilidad automática para IP Box |

No se suman ni sustituyen entre sí.

## Clasificación de una actividad

Una actividad puede proponerse como `R&D candidate` cuando existe una
incertidumbre técnica real y se prueba una solución cuyo resultado no era
obvio al inicio. Cambios de copy, colores, CRUD rutinario, mantenimiento,
configuración, migraciones mecánicas y soporte se registran como desarrollo u
operación, pero no se fuerzan dentro de I+D.

Estados fiscales permitidos:

```text
unreviewed -> candidate -> advisor_approved
                        -> rejected
                        -> adjusted
```

Solo un asesor autorizado puede cambiar a `advisor_approved`.

## Evidencia mínima de un proyecto candidato

```text
Project code
IP asset code
Start/end date
Technical problem
Technical uncertainty
Prior art / alternatives considered
Hypothesis
Experiment or implementation
Test/evaluation method
Result, including failed attempts
Conclusion and next decision
PRs, commits, releases and datasets
Contributors and contractual relationship
Time entries entered contemporaneously
Actual cost documents and payments
```

Los resultados negativos se conservan. Borrarlos hace el expediente menos
creíble y elimina evidencia de experimentación.

## Tiempo y personas

- Las horas se introducen de forma contemporánea por actividad y proyecto.
- Git no se utiliza para inferir horas.
- El tiempo no remunerado puede acreditar actividad, pero no se convierte en
  salario o gasto ficticio.
- El coste salarial candidato parte de nóminas y cargas reales y usa una
  metodología aprobada de asignación.
- Fundadores, directores, empleados, contratistas independientes y partes
  vinculadas se distinguen expresamente.

## APIs, modelos y nube

`agent_usage_ledger` sirve como evidencia de consumo técnico, pero el coste
estimado no sustituye la factura real. El cierre mensual debe reconciliar:

```text
invoice/payment
  -> provider and period
  -> agent/model usage
  -> usage purpose
  -> experiment/project
  -> IP asset
```

Propósitos iniciales:

```text
product_rnd
production
customer_delivery
internal_operations
marketing
testing
unallocated
```

La parte `unallocated` nunca se clasifica automáticamente como gasto de I+D.

## Integridad y retención

- No editar retrospectivamente una evidencia aprobada; crear una corrección
  enlazada que preserve el valor anterior.
- Usar timestamps, autor, fuente y motivo en cada cambio de clasificación.
- Mantener como mínimo el plazo legal aplicable. La referencia general
  chipriota es seis años; para procedencia, propiedad y vida completa del
  software se recomienda conservación permanente o, al menos, durante toda la
  explotación del activo y los periodos fiscales posteriores relevantes.
- Los secretos, credenciales, prompts completos y PII innecesaria no forman
  parte del expediente.

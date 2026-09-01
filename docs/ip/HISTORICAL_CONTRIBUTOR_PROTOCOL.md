---
summary: 'Protocolo PRE-CYPRUS para reconstruir colaboraciones históricas sin fabricar contratos, facturas ni horas.'
read_when:
  - A contributor worked without complete contractual or payment records
  - Preparing an IP ownership review
  - Reconstructing historical development activity
  - Planning a future Cyprus IP Box structure
---

# Protocolo de colaborador histórico

Este protocolo prepara evidencia para asesores. No califica por sí solo una
relación como laboral o profesional, no convierte pagos en gasto deducible y no
transfiere derechos de propiedad intelectual.

## Límites obligatorios

1. No fechar retrospectivamente contratos, facturas, partes de horas o actas.
2. No usar una entidad distinta para documentar servicios que realmente no
   prestó, contrató o controló.
3. No presentar horas estimadas como registros contemporáneos.
4. No modificar autores, fechas o mensajes de Git para mejorar el expediente.
5. No clasificar un coste o una actividad como fiscalmente elegible sin una
   decisión escrita del asesor competente.

Una reconstrucción se crea hoy, indica el periodo histórico al que se refiere y
explica siempre el método y su grado de confianza.

## Fase 1: conservar hechos

Crear un expediente por colaborador con:

- identidad y datos de contacto almacenados fuera del repositorio;
- persona o entidad que solicitó y recibió el trabajo;
- persona o entidad que dio instrucciones y aceptó entregables;
- forma real de organización: horario, autonomía, herramientas, exclusividad,
  capacidad de rechazar trabajo y riesgo económico;
- periodos reales de trabajo, sin inventar días exactos;
- pagos efectuados, medio, fecha, importe y justificante disponible;
- repositorios, cuentas, commits, PR, incidencias, mensajes y entregables;
- componentes o activos de software afectados;
- contrato, factura, nómina y cesión de derechos: presente, ausente o dudoso.

Los importes, documentos de identidad y conversaciones privadas no se guardan
en Git. El expediente contiene referencias a su ubicación segura y una huella
del archivo cuando sea apropiado.

## Fase 2: reconstruir actividad

Usar
[`HISTORICAL_TIME_RECONSTRUCTION.csv`](./templates/HISTORICAL_TIME_RECONSTRUCTION.csv)
para crear una línea por periodo, actividad y fuente.

Fuentes admisibles incluyen commits, PR, revisiones, incidencias, mensajes,
calendario, reuniones, archivos entregados y registros de despliegue. Un commit
demuestra actividad, pero no demuestra por sí solo duración, pago o titularidad.

Cuando no existan horas contemporáneas se registran tres valores:

- `hours_low`: mínimo defendible;
- `hours_best`: mejor estimación razonada;
- `hours_high`: límite superior razonable.

La fila debe marcarse `reconstructed`, incluir el método y conservar la fecha
real de reconstrucción. Si no existe base suficiente, se registra la actividad
sin asignar horas.

## Fase 3: determinar la relación real

El expediente se entrega a un abogado laboral y a un asesor fiscal español.
Ellos deben decidir por escrito entre, al menos, estas posibilidades:

- relación laboral;
- profesional independiente;
- colaboración puntual no habitual;
- hechos insuficientes o tratamiento distinto.

La etiqueta elegida por las partes no sustituye a los hechos. La prestación
retribuida dentro de la organización y dirección de otra persona es un indicio
laboral; el trabajo autónomo exige actuación habitual por cuenta propia y fuera
de esa dirección.

## Fase 4: regularizar solo con instrucción profesional

El registro
[`ADVISOR_DECISION_RECORD.md`](./templates/ADVISOR_DECISION_RECORD.md) debe
indicar, según el caso real:

- declaraciones, retenciones o cuotas que corregir;
- emisor, destinatario, concepto, fecha de expedición y periodo real de una
  posible factura tardía;
- alta o regularización laboral o de Seguridad Social;
- tratamiento contable del pago histórico;
- instrumento válido para reconocer o transmitir derechos sobre el software;
- entidad que será titular y contraprestación real, si procede;
- riesgos, plazos y evidencias que deben conservarse.

Hasta que exista esa decisión, el estado es `LEGAL_REVIEW_REQUIRED` y ningún
proceso del CRM puede crear facturas, asientos, contratos o clasificaciones
fiscales a partir del expediente.

## Fase 5: trabajo futuro

Todo trabajo nuevo debe comenzar con un documento firmado desde su fecha real
de entrada en vigor que cubra:

- entidad contratante correcta;
- naturaleza laboral o profesional;
- alcance, entregables y remuneración;
- confidencialidad y seguridad;
- titularidad y cesión escrita de derechos sobre código, documentación,
  datasets, prompts y modelos;
- identificación separada de IP preexistente;
- registro contemporáneo de tiempo por proyecto y actividad;
- pago trazable mediante nómina o factura válida.

El trabajo anterior puede describirse en un anexo de antecedentes con fechas
reales. Ese anexo no debe afirmar que existía un contrato en una fecha en la que
no existía.

## Encaje PRE-CYPRUS

Los activos y costes históricos permanecen `PRE-CYPRUS`. Una futura sociedad
chipriota no debe recibirlos mediante una factura creada para cubrir pagos
anteriores. Cualquier licencia, aportación o transmisión futura exige análisis
de titularidad, valoración, fiscalidad y precios de transferencia.

El gasto futuro solo se propone como candidato Nexus cuando la entidad que
pretenda el beneficio realiza o controla realmente la I+D y mantiene el
seguimiento por activo, proyecto, persona, coste e ingreso. La subcontratación a
partes vinculadas y la adquisición de IP reciben un tratamiento diferente y no
se convierten en gasto cualificado por cambiar el emisor de una factura.

## Referencias primarias

- [Estatuto de los Trabajadores, artículo 1](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430)
- [Estatuto del trabajo autónomo, artículo 1](https://www.boe.es/buscar/act.php?id=BOE-A-2007-13409)
- [Reglamento de facturación, artículos 2 y 11](https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696)
- [Ley General Tributaria, artículo 27](https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186)
- [Ley de Propiedad Intelectual, artículos 45, 51 y 97](https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930)
- [OCDE: Modified Nexus Approach](https://www.oecd.org/content/dam/oecd/en/topics/policy-sub-issues/harmful-tax-practices/beps-action-5-agreement-on-modified-nexus-approach-for-ip-regimes.pdf)

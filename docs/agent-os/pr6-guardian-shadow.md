---
summary: 'PR 6 de Zack Agent OS: Guardian en shadow mode — reglas deterministas, tools de lectura, informe estructurado y rutinas desactivadas.'
read_when:
  - Changing Guardian thresholds or rules
  - Reviewing a Guardian report
  - Deciding whether Guardian can leave shadow mode
---

# PR 6 — Guardian en shadow mode

Sexta entrega y última del roadmap inicial. El primer agente con reglas, tools,
prompt e informe propios.

**Nace apagado y en shadow.** El agente sigue en `disabled` desde el seed de
PR 1, sus dos rutinas se siembran **desactivadas**, y en shadow mode no envía
Discord, no crea tareas y no toca infraestructura: mira, correlaciona y escribe
un informe.

Sale de la rama de PR 5 (#312).

## La decisión que define a Guardian

**La IA no decide si el disco está al 90 %.** Recibe ese hecho ya calculado.

`rules.ts` es código con umbrales explícitos: detecta. El modelo recibe los
hallazgos y los ordena por urgencia real, correlaciona los que comparten causa y
explica por qué importan. Nada más.

Lo contrario —pedirle al modelo que mire métricas y diga si hay problema—
produce un vigilante que a veces no ve un servicio caído y a veces inventa una
incidencia. Ninguna de las dos cosas es aceptable en algo que te avisa de noche.

Y no es solo una instrucción del prompt: `validateModelReport` cruza los códigos
del informe con los de las reglas y **descarta los hallazgos que no existan**.
La severidad global también se recalcula desde los que sobreviven — si la
decidiera el modelo, bastaría con que exagerara para despertar a alguien de
madrugada.

## Umbrales, y por qué

```text
disco     ≥ 80 % warning · ≥ 90 % critical
inodos    ≥ 80 % warning · ≥ 90 % critical
RAM       ≥ 85 % warning
RAM+swap  ≥ 90 % y swap ≥ 50 % → critical
backup    ≥ 26 h → high
app       3 fallos seguidos → critical
TLS       ≤ 21 días warning · ≤ 7 días high
```

**El swap solo alarma acompañado de presión de memoria.** Una máquina con swap
usado y RAM libre lleva así desde el último pico.

**Tres fallos seguidos, no uno.** Un 500 aislado no es una caída, y tratarlo
como tal produce ruido.

**Los inodos merecen su propio mensaje**: el disco puede tener espacio de sobra
y aun así fallar toda escritura. El síntoma engaña.

### Agrupación de repeticiones

El collector corre cada cinco minutos: un disco lleno produce doce hallazgos por
hora. Sin agrupar, un informe diario tendría cientos de líneas iguales y el
problema real se perdería entre ellas.

Lo sostenido **sube** de severidad —seis fallos de n8n en una hora no son seis
avisos— pero nunca baja, y la evidencia se conserva entera: el hallazgo agrupado
cita todos los eventos que lo sostienen.

## Tools

Cuatro, todas de lectura y todas agregadas:

| Tool | Devuelve |
|---|---|
| `getSystemHealthSnapshot` | Recuentos por tipo y severidad de las últimas 24 h |
| `getOpenOperationalIncidents` | Los hallazgos ya calculados, con evidencia |
| `getAgentWorkerHealth` | Estado de los workers según sus latidos |
| `getAgentQueueHealth` | Recuentos de la cola y ejecuciones atascadas |

Ninguna devuelve eventos crudos. Con doce lecturas por hora, mandarlos todos
llenaría el contexto de repeticiones y dejaría fuera lo que importa.

`getOpenOperationalIncidents` es la central: materializa la separación
detección/interpretación, porque el modelo recibe **hechos**, no métricas que
tenga que juzgar.

## Rutinas

```text
guardian-daily             30 8 * * *   Europe/Madrid   catchUp: skip
guardian-weekly-capacity   0 9 * * 1    Europe/Madrid   catchUp: latest
```

Se siembran con `npm run seed:guardian-schedules`, **desactivadas**. El objeto
de configuración ni siquiera tiene campo `enabled`, para que no haya forma de
sembrarlas activas por descuido, y el `set` del upsert tampoco lo toca: si
alguien activa una a mano, volver a sembrar no la apaga.

`skip` en la diaria porque un informe de infraestructura de anteayer no le sirve
a nadie; `latest` en la semanal porque una revisión de capacidad de hace dos
días sigue valiendo.

## Evaluación

`guardian-replay.test.ts` es la suite que hay que volver a pasar cada vez que se
toque un umbral. Ocho escenarios completos con fixtures **sintéticos** —ni un
nombre, ni un email, ni un importe real—:

- disco llenándose progresivamente;
- backup que dejó de correr;
- caída correlacionada de servicio, app y base;
- n8n fallando repetidamente;
- evento duplicado;
- **falso pico que no debe escalar**;
- **inyección de prompt dentro de los datos**;
- un día entero sin incidencias.

Los dos destacados son los que más valen. El falso pico separa un vigilante útil
de uno que se ignora. Y la inyección demuestra tres capas: las reglas miran
números, no prosa, así que un nombre de servicio hostil no convierte un disco al
40 % en incidencia; si el texto llega al prompt va dentro del bloque no
confiable; y aunque el modelo obedeciera, **Guardian no alcanza ninguna tool de
escritura**.

## Lo que Guardian no puede hacer

- Reiniciar servicios, limpiar disco o aplicar migraciones.
- Crear tareas o notificaciones durante shadow mode.
- Acceder a tools financieras o de campañas — hay un test que lo comprueba.
- Añadir hallazgos que las reglas no detectaron.
- Decidir la severidad de su propio informe.

## Salir de shadow

Escrito en `definition.ts`, y no es una lista decorativa: sin medirlo, "parece
que funciona" es todo lo que se tendría.

```text
· al menos 14 días en shadow
· cero exposiciones de secretos en los informes revisados
· falsos positivos críticos bajo el umbral acordado
· todos los incidentes críticos reales detectados por las reglas
· coste dentro del presupuesto del agente
· revisión humana de una muestra de informes
· ningún efecto externo producido
```

## Pruebas

| Suite | Cubre |
|---|---|
| `guardian-rules` | Cada umbral con su caso, agrupación, y qué **no** detecta |
| `guardian-report` | Contrato, hallazgos inventados descartados, severidad recalculada, prompt |
| `guardian-replay` | Ocho escenarios completos, incluidos falso pico e inyección |

**Lo que no se verifica**: que las tools devuelvan lo esperado contra una base
real, y que el bucle completo produzca un informe válido con un modelo de
verdad. Lo primero necesita Postgres; lo segundo, clave de API — y ninguna
prueba llama a Gemini a propósito.

## El rol con el que se ejecuta

Las tools de Guardian piden `infrastructure:read`, y el rol por defecto de un
run sin humano detrás es `analyst`, que **no lo tiene**. Con ese default cada
llamada habría acabado en `policy_denied`: informes vacíos para siempre y la
causa invisible — la timeline solo dice `blocked`, y al modelo se le dice
únicamente que no tiene permiso, sin decir cuál.

El catálogo gana un `systemRole` opcional y Guardian se siembra con `ops`, que
es el rol más estrecho que alcanza sus tools. `admin`, `admin_limited_tasks` y
`brand` están prohibidos ahí: un agente que se ejecuta sin supervisión no opera
como administrador.

## Riesgos pendientes

1. **Los umbrales no se han validado contra datos reales.** Están puestos con
   criterio, no con historial. Los primeros catorce días de shadow existen para
   ajustarlos.
2. **Falta el paso que ejecuta el informe.** Las piezas están —reglas, tools,
   prompt, contrato, rutinas—, pero conectarlas en el worker es lo que hará el
   PR de arranque, cuando alguien decida activar Guardian.
3. **Sin datos no hay hallazgos.** Guardian depende del collector de PR 5, que
   no está instalado. Hasta entonces sus informes dirán, correctamente, que no
   hay nada que revisar.
4. **Los umbrales viven en código.** El blueprint pide que se puedan configurar
   sin desplegar; `settings_json` del agente es el sitio, y no se ha hecho para
   no mezclarlo con esto.

## Después de este PR

El roadmap inicial (PR 1-6) queda cubierto. Lo siguiente, por orden y solo
cuando Guardian tenga datos que digan que es fiable:

CRM Steward shadow → Deal Clerk drafts → Growth → SEO → Dev → acciones con
efecto, una por una.

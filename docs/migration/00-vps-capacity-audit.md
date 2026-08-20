# Auditoría de capacidad del VPS

> Ejecutada el 2026-08-21 sobre el VPS de producción, con acceso SSH por clave
> (usuario `deploy`, sin privilegios de root).
> No contiene contraseñas, tokens ni cadenas de conexión.

## Veredicto: **el gate de capacidad NO se cumple**

| Requisito del encargo | Real | |
|---|---|---|
| ≥ 4 vCPU | **2 vCPU** | ❌ |
| ≥ 8 GB RAM | **3,83 GiB** | ❌ |
| Swap configurada | 2 GB (`/swapfile`) | ✅ |
| ≥ 30 % de disco libre | **90 % libre** | ✅ |
| Sin errores graves ni presión de memoria | ninguno | ✅ |

Dos de los cinco criterios no se cumplen, y son los dos que no se arreglan
afinando configuración.

## Máquina

| | |
|---|---|
| Producto | netcup VPS 500 G12 |
| SO | Debian 13 (trixie), kernel 6.12.101 |
| CPU | 2 vCPU — AMD EPYC-Genoa |
| RAM | 3,83 GiB |
| Swap | 2 GB en fichero |
| Disco | 128 GB · 125 G en `/` · **113 G libres (6 % usado)** |
| Inodos | 3 % usados |

## Estado actual

Sano, y con holgura de sobra para lo que hace hoy:

```
loadavg            0,00  0,01  0,00      (sobre 2 vCPU)
presión memoria    avg60 = 0,00
presión CPU        avg60 = 0,20
OOM kills          0
servicios fallidos ninguno
```

### Lo que ya corre

| Contenedor | CPU | Memoria |
|---|---|---|
| `n8n` | 0,11 % | 342,6 MB |
| `caddy` | 0,00 % | 54,7 MB |
| `postgres` (n8n) | 0,15 % | 52,9 MB |
| `n8n-runner` | 0,00 % | 13,1 MB |
| **Total** | **~0,3 %** | **~463 MB** |

Imágenes Docker: 3,42 GB. Cinco volúmenes, todos en uso.
Puertos publicados: 22, 80 y 443. **PostgreSQL no está expuesto** — correcto.

Caddy sirve hoy un único dominio (`n8n.socialpro.es`) con compresión y cabeceras
de seguridad. Ampliarlo con más dominios es directo.

## El cálculo que decide

Memoria disponible ahora: **3,1 GiB**.

Estimación de lo que hay que añadir:

| Componente | Reposo | Pico |
|---|---|---|
| Next.js (standalone, SSR) | 300–500 MB | 800 MB – 1 GB |
| PostgreSQL 17 del CRM | 256–512 MB | 700 MB |
| Scheduler | ~10 MB | ~20 MB |
| Uptime Kuma | 100–150 MB | 200 MB |
| **Añadido** | **~0,7–1,2 GB** | **~1,7–1,9 GB** |

Sumando lo que ya corre (~463 MB) y el sistema (~300 MB):

- **En reposo:** ~1,5–2,0 GB de 3,83 → queda margen.
- **En pico:** ~2,5–2,7 GB de 3,83 → **queda un 30 % libre, por debajo del 40 % que exige el gate**.

Y ese pico no contempla lo peor:

**El OCR de nóminas.** Tesseract, `canvas` y MuPDF procesando un PDF pueden
sumar varios cientos de megas de golpe. Justamente es una función que hoy está
apagada porque falla en Vercel y que la migración pretende desbloquear. Un pico
de OCR concurrente con el build o con un backup es exactamente el escenario que
llena 3,83 GB.

**El build.** `next build` de este proyecto es intensivo. Con 2 vCPU compite con
todo lo demás; compilar en el propio VPS mientras sirve producción no es viable
sin degradar la respuesta.

## Riesgos si se migra tal cual

1. **OOM killer.** Al llenarse la memoria, el kernel mata procesos. Suele
   llevarse PostgreSQL o la aplicación — y con n8n en la misma máquina, una
   fuga en el CRM puede tumbar la automatización.
2. **Swap como parche.** Hay 2 GB, pero swapear PostgreSQL degrada la latencia
   de forma brutal. Sirve para picos de segundos, no para funcionamiento normal.
3. **2 vCPU compartidas** entre Next.js con SSR, PostgreSQL, n8n, Caddy y el
   scheduler. El OCR y la generación de PDF son de CPU pura y bloquean.
4. **Un solo punto de fallo.** Hoy n8n puede caer sin arrastrar la web. Después,
   todo comparte máquina.

## Opciones

### A — Ampliar el VPS *(recomendada)*

netcup permite subir de plan conservando el sistema. Un plan con **4 vCPU y
8 GB** cumple el gate con margen y deja sitio para el OCR y para construir la
imagen en la propia máquina.

Coste: unos pocos euros al mes más, contra lo que se ahorra en Neon y Vercel
—solo las ramas de Neon costaron 70,61 $ en julio— sigue saliendo muy a favor.

### B — Migrar solo la aplicación, dejar la base en Neon

Menos memoria (sin PostgreSQL propio) y se conserva el respaldo gestionado de
Neon. Se ahorra Vercel pero no Neon, y quedan dos proveedores en juego.

### C — Migrar con mitigaciones y aceptar el riesgo

Límites de memoria por contenedor, `shared_buffers` bajo, swap ampliada a 4 GB,
OCR limitado a uno cada vez y construir la imagen fuera del VPS.

Es viable, pero **deja el sistema funcionando cerca del límite**: sin margen
para crecer y con el OCR como riesgo permanente.

### D — No migrar

Todo sigue igual. Se conserva el coste actual.

## Recomendación

**Opción A.** El resto de la máquina está impecable —disco de sobra, sin
errores, sin presión, configuración limpia— y el único problema es
dimensionado. Ampliar convierte un proyecto ajustado en uno holgado por un
coste marginal frente al ahorro.

Si la ampliación no es posible, **B** antes que **C**: prefiero dos proveedores
a un servidor al borde de la memoria con datos financieros dentro.

## Qué NO se ha hecho

Según el encargo, la auditoría se detiene aquí y espera decisión. **No se ha
tocado nada** del VPS: ni contenedores, ni configuración, ni firewall. El único
cambio ha sido crear el usuario `deploy` y autorizar una clave pública.

Pendiente para cuando haya decisión: prueba de carga representativa para medir
el consumo real en vez de estimarlo.

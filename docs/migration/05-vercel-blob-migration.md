# Migración de Vercel Blob

> **Ningún objeto se borra de Vercel en esta fase.** Ni en la siguiente. El
> borrado es Fase 9 y necesita autorización expresa.

## El problema que decide el calendario

Hay **dos formas** de localizar un fichero, y solo una es migrable de forma
directa.

### 1. Con fila en base de datos — migrable

Ocho columnas guardan la URL del blob:

| Columna | Tabla |
|---|---|
| `fileUrl`, `signedFileUrl` | `contracts` |
| `fileUrl` | `generatedContracts` |
| `sourceFileUrl` | `brandBriefs` |
| `fileUrl`, `receiptFileUrl` | `invoices` |
| `fileUrl` | `invoiceImports` |
| `url`, `path` | `files` |
| `pdfUrl` | `issuedInvoices` |
| `coverUrl`, `ogImageUrl` | `posts` |

Se copia el objeto, se guarda la nueva clave y se actualiza la fila. Trabajo
mecánico.

### 2. Sin fila en base de datos — **el punto delicado**

Las **fotos de talento, las de equipo y los logos de marca** no tienen ninguna
fila que las apunte. El código lo dice sin rodeos:

```ts
void blob; // blob.url stored implicitly via Vercel Blob list(); proxy uses it
```

La lectura redescubre el fichero listando por prefijo:

```ts
list({ prefix: `talents/${id}-` })
```

Es decir: **la convención de nombres es el índice**. No hay nada que
reescribir… pero tampoco nada que consultar. Copiar esos ficheros sin más deja
bytes en el disco que ningún código sabe encontrar, porque `list()` con prefijo
no existe en un sistema de ficheros con claves UUID.

**Antes de mover un byte de esos tres prefijos hay que construir el índice.**
Es una tabla con `(entidad, id, storageKey)` poblada desde el inventario, más
un cambio en las tres rutas proxy para consultarla en vez de listar.

Es la razón por la que esta fase no es "copiar ficheros".

## Orden

### 1. Inventario

```bash
npx tsx scripts/inventory-vercel-blob.ts > inventario.json
```

Solo lectura. Recorre los dos stores paginando —sin el bucle solo se verían los
primeros 1000 objetos y el inventario saldría incompleto sin avisar— y agrupa
por prefijo, marcando los tres que no tienen índice.

### 2. Índice para fotos y logos

La tabla `entity_assets` conserva `(tipo, entidad, storageKey, fecha)` y las
tres rutas proxy la consultan antes de abrir el objeto mediante el proveedor
portable. El backfill parte del inventario y es dry run por defecto:

```bash
npx tsx scripts/backfill-entity-asset-index.ts inventario.json
npx tsx scripts/backfill-entity-asset-index.ts inventario.json --apply
```

Durante la convivencia queda un fallback por `list()` con aviso en logs. Se
retira solo cuando el inventario esté poblado y no aparezcan esos avisos.

### 3. Copia

```bash
npx tsx scripts/migrate-vercel-blob-to-local.ts            # dry run
npx tsx scripts/migrate-vercel-blob-to-local.ts --apply
```

Idempotente y verificado por contenido. Detalles que importan:

- **Compara por checksum, no por tamaño.** Una copia truncada suele pasar el
  test de "existe y pesa parecido".
- **Nunca sobrescribe algo distinto.** Si el destino existe con otro contenido,
  lo marca `difiere` y sigue. Sobrescribir podría destruir algo subido después
  de empezar la copia.
- **Escritura atómica**, para que un corte no deje un fichero a medias que
  parezca bueno en la siguiente pasada.
- **Todo lo que no esté en la lista de prefijos públicos se trata como
  privado.** Equivocarse en ese sentido deja una foto detrás de permisos;
  equivocarse en el contrario deja un contrato accesible por URL.

### 4. Convivencia

Mientras dure el periodo de vuelta atrás:

- lo nuevo se escribe en local
- las lecturas buscan primero en local y **caen a Vercel Blob** si no está
- cada lectura por respaldo queda registrada

Ese registro es el único dato que dirá cuándo se puede retirar el respaldo. Sin
él, apagarlo sería a ciegas.

`@vercel/blob` **no se desinstala** hasta que ese periodo termine.

## Criterios para dar la fase por buena

- [ ] 100 % de objetos inventariados
- [x] Índice y backfill construidos para los tres prefijos sin fila en base de datos
- [ ] 100 % copiados o clasificados
- [ ] Bytes de origen y destino coinciden
- [ ] Checksums coinciden
- [ ] Una subida nueva funciona contra local
- [ ] Una descarga privada sigue respetando permisos
- [ ] Las URL antiguas siguen funcionando
- [ ] Cero objetos borrados en Vercel

## Sin ejecutar

Los dos scripts están escritos y comprueban tipos, pero **no se han ejecutado**:
hacerlo requiere el token de Vercel Blob y un destino donde escribir. Se ejecutan
en staging cuando el VPS esté ampliado, empezando por el dry run.

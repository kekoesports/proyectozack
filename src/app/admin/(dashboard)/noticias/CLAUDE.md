# Normas de redacción — Noticias (body_md)

## REGLA OBLIGATORIA: todo URL va envuelto en sintaxis markdown

Nunca pegues una URL como texto plano. El renderer de artículos (`src/features/news/components/NewsArticleBody.tsx`) **no detecta URLs sueltas** — quedan como cadena sin formato y sin click.

**Incorrecto:**
```
La final se juega aquí: https://www.esea.net/index.php?s=league&d=standings
Mira el tweet: https://x.com/user/status/123456
```

**Correcto:**
```
La final se juega aquí: [ESEA Standings](https://www.esea.net/index.php?s=league&d=standings)
[Tweet de @usuario](https://x.com/user/status/123456)
```

---

## Patrones soportados por el renderer

### Enlace externo inline
```
[texto legible](https://url)
```
Renderiza como `<a>` naranja que abre en nueva pestaña.

### Enlace interno (mismo sitio)
```
[texto](/ruta/interna)
```
Renderiza como `<a>` con subrayado rosa.

### CTA prominente (línea aparte)
Para "Ver bracket", "Inscríbete aquí", "Formulario oficial", etc. — pon el link solo en su propia línea, con o sin emoji/texto de prefijo:

```
👉 [Inscríbete en el torneo](https://url-del-formulario.com)

Ver bracket: [Challonge — Sinon Community Series](https://challonge.com/...)
```
Renderiza como píldora naranja con flecha. Usa este patrón para CTAs importantes.

---

## Patrones NO soportados (el renderer los ignora)

| Sintaxis | Resultado |
|----------|-----------|
| `<https://url>` | texto plano |
| `https://url` (sin `[]()`) | texto plano |
| `![alt](url)` (imágenes markdown) | texto plano |
| Listas numeradas `1.` | texto plano |
| Tablas markdown | texto plano |
| Bloques de código ` ``` ` | texto plano |

---

## Convenciones de label

| Tipo de URL | Label recomendado |
|-------------|------------------|
| Tweet / post en X | `[Tweet de @handle](url)` |
| Sitio oficial de torneo | `[nombre legible del torneo](url)` |
| Perfil Twitch / YouTube | `[nombre en Twitch](url)` |
| PDF o documento | `[Reglamento oficial (PDF)](url)` |
| Perfil genérico | `[dominio.tld](url)` como mínimo |

---

## Checklist antes de guardar

- [ ] ¿Hay algún `http://` o `https://` en el body que **no** esté inmediatamente precedido por `](`?
- [ ] ¿Los CTAs importantes usan el patrón de línea aparte `👉 [label](url)`?
- [ ] ¿El excerpt no contiene URLs crudas?

Si queda algún URL suelto, envuélvelo antes de publicar.

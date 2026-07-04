# SocialPro Giveaways — revisión legal España

**Estado:** 🚧 **Borrador interno · Pendiente de revisión por gestoría/abogado** 🚧
**Autor:** producto (redacción técnica)
**Fecha:** 2026-07-04
**Ámbito:** `/sorteos` (SocialPro Giveaways) en España

> ⚠️ **Este documento NO es asesoramiento jurídico definitivo.** Es una redacción técnica
> preparada por producto para acelerar la revisión con gestoría/abogado. No aplicar ninguna
> cláusula a producción sin validación firmada por un profesional colegiado.

---

## 1. Resumen ejecutivo

Se han identificado **4 bloques** que requieren cierre legal antes de retirar `noindex` y
`LegalDraftBanner` de las páginas `/sorteos/(legal)/*`:

1. **Ley aplicable y jurisdicción** (Términos §11) — proponer redacción prudente que respete
   el fuero especial imperativo del consumidor (art. 90.2 TRLGDCU).
2. **Limitación de responsabilidad** (Términos §10) — reescribir para excluir daños indirectos
   sin caer en cláusula abusiva; mencionar dependencias de terceros (Steam / KeyDrop / hosting).
3. **Base jurídica del ranking global** (Privacidad §3) — elegir entre interés legítimo
   (art. 6.1.f RGPD) con opt-out ya implementado, o convertirlo en opt-in (6.1.a).
4. **Compliance de comunicaciones comerciales de juego** (RD 958/2020) — 🔴 **RIESGO
   ALTO no identificado antes**: promocionar KeyDrop con código de afiliado a residentes
   en España está dentro del ámbito del RD 958/2020 (arts. 2 y 6.2). Verificar título
   habilitante de KeyDrop en España antes de publicar.

Fuera del scope de este documento: sistemas cosméticos, contratos con creadores, tratamiento
de datos de facturación (ya cubierto por privacidad general de la agencia).

---

## 2. Riesgos principales

### 🔴 R1 — Promoción de operador de juego sin título habilitante en España

**Base legal:** [RD 958/2020, art. 2 y art. 6.2 (BOE)](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2020-13495).

- El art. 2 define expresamente como sujetos obligados a "**afiliados... agencias de
  publicidad o prestadores de servicios de intermediación**" que difundan comunicaciones
  comerciales de actividades de juego.
- El art. 6.2 prohíbe "*comunicaciones comerciales dirigidas a residentes en España... de
  entidades que no tengan título habilitante*".
- El código promocional `ZACKCSGO` de KeyDrop dentro de `/sorteos/[creator]` es una
  **comunicación comercial de actividad de juego** en el sentido del art. 3.g del RD.

**Acción requerida:** verificar si KeyDrop (o la sociedad titular de `keydrop.com`) tiene
título habilitante DGOJ vigente en España. Datos comprobables por la parte titular / gestoría
en el [Registro General de Licencias de Juego (DGOJ)](https://www.ordenacionjuego.es/es/operadores-habilitados).

**Si no lo tiene**, opciones:
- **A** Retirar la promoción del código KeyDrop para residentes España (geo-block / disclaimer).
- **B** Reformular como "comparador informativo" sin CTA de afiliado (no descuenta el riesgo).
- **C** Sustituir por operadores con título habilitante DGOJ.
- **D** Consultar a gestoría si la mecánica actual es defendible como "sorteo interno gratuito"
  con el partner solo informativo — el trámite de código y kd.link con affiliate tracking
  sugieren que **no**.

**Impacto:** el resto de este documento se redacta bajo la asunción de que este bloque se
cierra antes de publicar. Si no se cierra, publicar legales con el flujo actual amplifica el
riesgo regulatorio.

### 🟡 R2 — Cláusulas abusivas en limitación de responsabilidad

Reglas base:
- [RDL 1/2007 (TRLGDCU) art. 82-91 (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555).
- Cláusulas que excluyan por completo la responsabilidad del prestador son nulas si el usuario
  es consumidor.
- Se permite limitar daños indirectos, lucro cesante y responsabilidad por incidentes de
  terceros con matices.

El texto actual de §10 es breve y prudente pero incluye "no responde por... incidencias
derivadas de partners externos". Necesita mencionar que sí responde por sus propios servicios
básicos y que las limitaciones no afectan derechos imperativos del consumidor.

### 🟡 R3 — Jurisdicción impuesta al consumidor

- [TRLGDCU art. 90.2](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555): "*será nula la
  sumisión a arbitrajes distintos del arbitraje de consumo* [...] *o la sumisión a Jueces o
  Tribunales distintos de los que corresponda al domicilio del consumidor o al lugar del
  cumplimiento de la obligación*".
- No podemos imponer al usuario tribunales de una ciudad concreta si es consumidor.

### 🟡 R4 — Base jurídica del ranking

- El ranking muestra nombre público de Steam + avatar + posición mensual.
- Interés legítimo (art. 6.1.f RGPD) exige [test de ponderación de 3 pasos](https://www.aepd.es/documento/informe-juridico-rgpd-interes-legitimo.pdf):
  1) interés real, específico y actual · 2) necesidad y proporcionalidad · 3) balance con
  derechos del interesado.
- El modo privado (opt-out) ya implementado reduce riesgo. AEPD suele preferir consentimiento
  cuando hay identificación pública en internet.

### 🟢 R5 — Sorteos internos gratuitos

- [Ley 13/2011 art. 3.i (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2011-9280) excluye
  del ámbito de aplicación las **combinaciones aleatorias con finalidad exclusivamente
  publicitaria** cuando no hay sobreprecio ni tarificación adicional.
- Nuestros sorteos internos (con `ENTRY_COIN_REWARD` y `EntryButton` sin depósito) encajan
  en esa exclusión.
- Riesgo bajo si no hay ninguna forma de "pagar" para participar (verificar que no existe
  vía puntos comprados, transferidos o recompensas por depósito externo — hoy no existe).

---

## 3. Recomendación conservadora

En orden de prioridad:

1. **Antes de retirar `noindex`**: cerrar R1 con evidencia documentada (captura Registro DGOJ,
   confirmación de que KeyDrop tiene licencia, o retirar promoción del código para residentes España).
2. **Contratar revisión gestoría/abogado** de los 3 textos propuestos abajo (§4, §5, §6).
   Coste típico revisión legal de plataforma: 1–3 sesiones.
3. **Mantener `LegalDraftBanner`** hasta que exista firma de gestoría/abogado.
4. **Mantener `robots: { index: false, follow: false }`** hasta punto 3 cerrado.
5. **Ranking**: mantener interés legítimo + opt-out **con test de ponderación documentado**
   (§6). Alternativa: convertir a opt-in solo si gestoría lo pide.

---

## 4. Texto propuesto — Términos §10 · Limitación de responsabilidad

> Redacción propuesta para revisión. Sustituye a la actual "§10 Limitación de responsabilidad".

```
10. Limitación de responsabilidad

10.1  SocialPro presta el servicio de la plataforma «SocialPro Giveaways» según su
      configuración y estado en cada momento. La disponibilidad continua del servicio
      no está garantizada; podrán existir interrupciones programadas por mantenimiento
      o incidencias técnicas.

10.2  Dentro de los límites permitidos por la ley aplicable, y sin perjuicio de los
      derechos que correspondan al usuario cuando actúe como consumidor, SocialPro no
      responderá por:

      a) Pérdidas indirectas, lucro cesante, pérdida de datos o pérdida de oportunidad
         derivadas del uso de la plataforma, cuando no exista dolo o negligencia grave.

      b) Incidencias derivadas de servicios de terceros necesarios para el
         funcionamiento del servicio, en particular:
           i. Plataforma Steam (Valve Corporation) — bloqueos de trade, restricciones
              de intercambio o caídas de sesión OpenID.
          ii. Partners externos (KeyDrop u otros) — disponibilidad de sus sorteos,
              términos aplicables a la participación en su plataforma o entrega de
              sus propios premios.
         iii. Proveedores de infraestructura (Vercel, Neon, Resend u otros equivalentes).
          iv. Cambios en las APIs de terceros que hagan inviable el servicio en su
              forma actual.

      c) La falta de stock, la demora en el envío o la imposibilidad de completar el
         canjeo cuando exista causa objetiva justificada (agotamiento, rechazo del trade
         offer por Steam, dirección de envío no válida, etc.).

10.3  Las limitaciones del apartado 10.2 no se aplicarán:
      a) A los daños causados por dolo o negligencia grave.
      b) A los derechos imperativos que la normativa de consumo reconozca al usuario
         cuando actúe como consumidor.
      c) A la responsabilidad por los productos digitales entregados en cuanto a su
         adecuación al fin descrito.

10.4  Los premios de skins CS2 se entregan mediante Steam Trade Offer y su envío está
      sujeto a que Steam permita el intercambio en el momento del canjeo. SocialPro
      no responde por bloqueos, holds o restricciones de trade impuestos por Steam
      con posterioridad al canjeo.
```

**Notas para gestoría:**
- ¿10.2.a es defendible frente a art. 82 TRLGDCU? En consumo típico se acepta si no
  desnaturaliza el objeto del contrato.
- ¿10.3.c ("productos digitales") requiere referencia expresa al Real Decreto-ley 7/2021
  sobre suministro de contenidos digitales?
- ¿Necesitamos incluir cláusula sobre "obligación del usuario de mantener sus credenciales
  Steam seguras"?

---

## 5. Texto propuesto — Términos §11 · Ley aplicable y jurisdicción

> Redacción propuesta para revisión. Sustituye a la actual "§11 Ley y jurisdicción" que
> está marcada como pendiente.

```
11. Ley aplicable y jurisdicción

11.1  Estos términos se rigen por la legislación española.

11.2  Las partes se someten a la jurisdicción y competencia de los Juzgados y Tribunales
      del domicilio social de SocialPro para cualquier controversia derivada del uso de
      la plataforma, cuando el usuario no actúe como consumidor.

11.3  Cuando el usuario actúe como consumidor con residencia habitual en España, la
      jurisdicción competente será la del domicilio del propio consumidor, conforme al
      artículo 90.2 del Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que
      se aprueba el texto refundido de la Ley General para la Defensa de los Consumidores
      y Usuarios.

11.4  Cuando el usuario resida habitualmente en otro Estado miembro de la Unión Europea,
      serán aplicables las reglas de fuero especial del Reglamento (UE) 1215/2012 (Bruselas
      I bis) y del Reglamento (CE) 593/2008 (Roma I) en materia de contratos de consumo.

11.5  El titular del servicio es [RAZÓN SOCIAL] · CIF [CIF] · con domicilio social en
      [DOMICILIO SOCIAL]. Contacto: info@socialpro.es.

11.6  Antes de acudir a los tribunales, el usuario podrá presentar reclamaciones de
      consumo a través de la plataforma europea de resolución de litigios en línea
      disponible en https://ec.europa.eu/consumers/odr/ o ante la Junta Arbitral de
      Consumo competente por su domicilio.
```

**Notas para gestoría:**
- Confirmar si SocialPro/ElevateX Agency PA SL está adherida a la Junta Arbitral de Consumo
  (referencia al ODR es opcional pero es buena práctica).
- Rellenar placeholders `[RAZÓN SOCIAL]`, `[CIF]`, `[DOMICILIO SOCIAL]`.
- Si el usuario es empresa, la cláusula 11.2 es válida sin más. Con consumidores es la 11.3
  la que rige.

---

## 6. Texto propuesto — Privacidad §3 · Base jurídica del ranking global

> Redacción propuesta para sustituir el párrafo actual sobre "ranking global" en §3 Base
> jurídica del tratamiento, que hoy está marcado como "pendiente de revisión legal".

```
Base jurídica: interés legítimo (art. 6.1.f RGPD)

3.5  El ranking mensual público de la plataforma se apoya en el interés legítimo del
     responsable del tratamiento (art. 6.1.f RGPD): fomentar la participación en la
     plataforma y reconocer la actividad de la comunidad de creadores, mostrando de
     forma ordenada los primeros puestos por participaciones en sorteos.

3.6  El ranking muestra exclusivamente el nombre público del perfil Steam y su avatar
     público (los mismos datos que ya son visibles en el propio perfil Steam) junto con
     el número de participaciones del mes en curso.

3.7  Test de ponderación (art. 6.1.f RGPD):
      a) Interés real y actual — visibilizar la actividad comunitaria y hacer atractiva
         la participación es una finalidad legítima del servicio.
      b) Necesidad — el ranking es el mecanismo elegido para reconocer la actividad;
         se limita a la mínima información identificativa ya pública en Steam.
      c) Balance con derechos del interesado — se mitiga con:
          i.  Opción «Perfil privado» permanentemente disponible en /sorteos/perfil,
              que enmascara el nombre del usuario en el listado (ej. «k*****»).
         ii.  Sin datos económicos, de contacto o de participación en apuestas.
        iii.  Datos que ya son públicos en la fuente original (Steam).
         iv.  El usuario puede solicitar la eliminación de su cuenta según §7.

3.8  El usuario puede ejercer en cualquier momento su derecho de oposición al
     tratamiento (art. 21 RGPD) activando el modo privado en /sorteos/perfil o
     escribiendo a info@socialpro.es. El modo privado se aplica inmediatamente al
     siguiente cálculo del ranking.

3.9  Este análisis de ponderación se documenta y actualiza en el registro de
     actividades de tratamiento de SocialPro.
```

**Notas para gestoría:**
- AEPD publicó [informe jurídico sobre interés legítimo (2018)](https://www.aepd.es/documento/informe-juridico-rgpd-interes-legitimo.pdf).
  Si gestoría prefiere consentimiento (6.1.a) con opt-in explícito, adaptamos y convertimos
  el ranking en opt-in visible en el registro (registro nuevo → checkbox).
- Alternativa opt-in (para tener redactada): "El ranking mensual público solo mostrará su
  nombre y avatar Steam si usted lo autoriza expresamente al registrarse o desde
  `/sorteos/perfil`. Puede revocar el consentimiento en cualquier momento con efecto
  inmediato."

---

## 7. Checklist para publicar legales (retirar `noindex` + `LegalDraftBanner`)

Para poder cambiar `robots: { index: true, follow: true }` y retirar `<LegalDraftBanner />`
del layout `(legal)/layout.tsx`, revisar y firmar:

### Datos de identidad del prestador

- [ ] Razón social completa: `[RAZÓN SOCIAL]`
- [ ] CIF: `[CIF]`
- [ ] Domicilio social: `[DOMICILIO SOCIAL]`
- [ ] Email de contacto legal: `info@socialpro.es`
- [ ] Datos registrales (Registro Mercantil, tomo/folio): `[TOMO/FOLIO/HOJA]`
- [ ] Nombre y contacto del responsable del tratamiento de datos si es distinto del anterior.

### Términos de uso

- [ ] §10 Limitación de responsabilidad revisada por gestoría — texto propuesto §4 arriba.
- [ ] §11 Ley aplicable y jurisdicción revisada por gestoría — texto propuesto §5 arriba.
- [ ] Placeholders `[RAZÓN SOCIAL]`, `[CIF]`, `[DOMICILIO SOCIAL]` rellenados.
- [ ] §5 Puntos SocialPro — confirmar redacción de "no dinero, no cripto, no valor, no
      transferible, no efectivo" contra jurisprudencia reciente.
- [ ] §6 Canjeo — texto de "revisión manual" ya incorporado (PR-C mergeado 2026-07-04).
- [ ] §7 Partners externos — reforzar disclaimer si se decide mantener promoción KeyDrop
      (ver R1).

### Privacidad

- [ ] §3.5-3.9 Ranking — base jurídica documentada — texto propuesto §6 arriba.
- [ ] Confirmar identidad del Delegado de Protección de Datos (DPD) si aplica por
      volumen de tratamiento (RGPD art. 37).
- [ ] Registro de actividades de tratamiento (RGPD art. 30) actualizado y disponible
      para inspección AEPD.
- [ ] Cookies: confirmar si `/sorteos` usa solo cookies estrictamente necesarias
      (session Better Auth + CSRF token). Si añadimos analytics, activar banner de cookies.
- [ ] Contratos de encargado de tratamiento firmados con Vercel, Neon, Resend (arts. 28-29
      RGPD).
- [ ] Análisis de riesgos y, si corresponde, Evaluación de Impacto (EIPD art. 35) para el
      tratamiento de perfiles de menores no elegibles (el servicio es +18).

### Juego responsable

- [ ] Confirmar canales oficiales citados vigentes: jugarbien.es, tel. 900 810 011,
      RGIAJ, FEJAR.
- [ ] Sección "Autoexclusión externa" — texto sigue correcto post-DGOJ 2024.

### FAQ

- [ ] Copy consistente con Términos/Privacidad revisados.

### Compliance RD 958/2020 (comunicaciones comerciales de juego)

- [ ] **Bloqueante**: confirmar si KeyDrop tiene título habilitante DGOJ vigente
      (ver R1). Documentar prueba (captura del registro DGOJ o comunicación oficial).
- [ ] Si no tiene título habilitante: decidir modelo (retirar código, geo-block, sustituir
      operador).
- [ ] Si tiene título habilitante: revisar que las creatividades (banner Dust II Roadtrip,
      texto "Reclamar", cta "Ir a CSGO-SKINS") cumplen art. 8 y ss. del RD 958/2020
      (principios éticos, prohibición de figuras públicas menores, franja horaria si aplica).
- [ ] Confirmar si SocialPro debe registrarse como afiliado ante DGOJ o si el operador lo
      cubre por delegación (art. 37.2 RD 958/2020).

### Edad mínima y +18

- [ ] Sistema de verificación de edad — actualmente confiamos en declaración durante
      login Steam. ¿Es suficiente si la actividad principal es sorteo interno gratuito?
      (Probablemente sí en el interno; el problema es el CTA hacia partners de juego,
      ver R1.)

### Publicación

- [ ] Todos los puntos anteriores validados con firma de gestoría/abogado.
- [ ] Retirar `<LegalDraftBanner />` de `(legal)/layout.tsx` — 1 línea.
- [ ] Cambiar `robots: { index: true, follow: true }` en las 4 metadatas.
- [ ] Actualizar sitemap si aplica.
- [ ] Guardar en repositorio interno la versión firmada por la asesoría (PDF).

---

## 8. Preguntas concretas para gestoría/abogado

Ordenadas por prioridad. Trasladar tal cual a la primera sesión de revisión.

### Bloqueantes (antes de publicar)

1. **KeyDrop — RD 958/2020**. ¿Podemos mantener el código promocional `ZACKCSGO` y los
   CTAs de "Reclamar" hacia `kd.link` en `/sorteos/[creator]` si KeyDrop **no** tiene título
   habilitante DGOJ vigente? Si no podemos, ¿qué opciones existen (geo-block usuarios ES,
   retirar CTA, sustituir por operador con licencia)?

2. **§11 Ley y jurisdicción**. ¿La redacción propuesta (§5 de este documento) respeta el
   fuero especial imperativo de consumidor del art. 90.2 TRLGDCU y evita cláusula abusiva?
   ¿Necesitamos adherirnos formalmente a la Junta Arbitral de Consumo?

3. **§10 Limitación de responsabilidad**. ¿La redacción propuesta (§4 de este documento)
   evita nulidad por art. 82-91 TRLGDCU? ¿Debemos citar expresamente el RD-ley 7/2021 sobre
   contenidos digitales?

### Base jurídica del ranking

4. **Ranking global**. ¿Interés legítimo (6.1.f) con opt-out ya implementado (modo privado)
   es defensable, o AEPD preferiría opt-in explícito?

5. **Registro de actividades de tratamiento** (RGPD art. 30). ¿Está actualizado con el
   tratamiento "Ranking mensual público de SocialPro Giveaways"?

### Datos de identidad

6. Datos exactos para rellenar los placeholders `[RAZÓN SOCIAL]`, `[CIF]`, `[DOMICILIO
   SOCIAL]`, `[TOMO/FOLIO/HOJA]`. ¿Es SocialPro directamente o ElevateX Agency PA SL?

### Datos de consumo / plataforma

7. **DPD / Data Protection Officer**. ¿Debemos designar formalmente DPD ante AEPD por
   volumen o naturaleza del tratamiento? Volumen actual: ~cientos de usuarios plataforma;
   crecimiento previsto: miles.

8. **Contratos de encargado de tratamiento** firmados con Vercel, Neon y Resend. ¿Están
   disponibles copias vigentes?

9. **Cookies**. Confirmar clasificación de cookies (Better Auth session + CSRF) como
   "estrictamente necesarias" que no requieren consentimiento previo. Si en el futuro se
   añade analytics, ¿banner de cookies obligatorio con opt-in?

### Estructura de canje

10. **Steam Trade Offer**. ¿La cláusula 10.4 propuesta cubre suficientemente la limitación
    de responsabilidad ante bloqueos de trade impuestos por Steam?

11. **Envío físico de merch**. ¿Necesitamos incorporar información pre-contractual del
    RD 24/2021 sobre venta a distancia si el usuario canjea puntos por merch físico enviado?

### Publicidad y creadores

12. **Códigos promocionales**. ¿La forma de mostrar `ZACKCSGO` en la card KeyDrop
    (BrandCardKeyDrop) cumple con el art. 13 del RD 958/2020 sobre promociones si KeyDrop
    tuviera licencia? ¿Faltan disclaimers (juega con responsabilidad, +18)?

13. **Sorteos internos gratuitos**. Confirmar que la calificación como "combinaciones
    aleatorias con fines publicitarios" (Ley 13/2011 art. 3.i) es sostenible con nuestra
    mecánica (participación con puntos ganados sin depósito).

---

## 9. Cosas que NO debemos afirmar todavía

Hasta cerrar §7 y §8:

- ❌ NO afirmar que la plataforma cumple RD 958/2020 sin la verificación DGOJ hecha.
- ❌ NO afirmar que "SocialPro no tiene responsabilidad alguna" ni fórmulas equivalentes que
     constituyan cláusula abusiva por art. 82-91 TRLGDCU.
- ❌ NO afirmar en material público "cumplimos totalmente el RGPD" hasta tener registro de
     actividades de tratamiento firmado y test de ponderación documentado.
- ❌ NO usar en producción los textos §4, §5, §6 propuestos hasta que gestoría/abogado los
     firme (con o sin ajustes).
- ❌ NO retirar el `LegalDraftBanner` ni cambiar `robots: { index: true }` hasta el punto
     anterior.
- ❌ NO indexar `/sorteos/(legal)/*` hasta cierre completo.
- ❌ NO promocionar KeyDrop en material impreso, ads o RRSS a residentes en España hasta
     confirmar §8 pregunta 1.

---

## 10. Fuentes citadas (para referencia rápida)

- [Ley 13/2011, de regulación del juego (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2011-9280) — art. 3.i excluye combinaciones aleatorias promocionales.
- [Real Decreto 958/2020, comunicaciones comerciales de juego (BOE)](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2020-13495) — art. 2 (afiliados en scope), art. 6.2 (prohibición operadores sin título).
- [RDL 1/2007, TRLGDCU (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555) — art. 82-91 cláusulas abusivas, art. 90.2 jurisdicción consumidor.
- [Ley 34/2002, LSSI-CE (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758) — información pre-contractual del prestador.
- [Reglamento (UE) 2016/679 (RGPD) EUR-Lex](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32016R0679) — art. 6 bases jurídicas, art. 21 derecho oposición.
- [LO 3/2018, LOPDGDD (BOE)](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673) — desarrollo nacional del RGPD.
- [AEPD — Informe jurídico interés legítimo](https://www.aepd.es/documento/informe-juridico-rgpd-interes-legitimo.pdf).
- [DGOJ — Registro de operadores habilitados](https://www.ordenacionjuego.es/es/operadores-habilitados).
- [Reglamento (UE) 1215/2012, Bruselas I bis (EUR-Lex)](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32012R1215).
- [Reglamento (CE) 593/2008, Roma I (EUR-Lex)](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32008R0593).

---

## 11. Historial de versiones

- **2026-07-04 v0.1** — Borrador inicial preparado por producto tras auditoría legal
  interna. Sin revisión externa. Marcado explícitamente como no vinculante.

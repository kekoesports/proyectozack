# TODOs para abogado / gestoría

> Decisiones que requieren validación externa firmada antes de retirar `noindex` de las páginas legales o antes de reactivar módulos gated.

Última actualización: 2026-07-05

## Bloque 1 — R1: KeyDrop y RD 958/2020

- [ ] Verificar en el [Registro DGOJ](https://www.ordenacionjuego.es/es/operadores-habilitados) si la sociedad titular de `keydrop.com` tiene título habilitante para operar juego online en España.
- [ ] Decidir vía:
  - **A**: retirar de forma definitiva la promoción del código KeyDrop para residentes España (Fase 0 ya implementa el gating provisional por país + feature flag).
  - **B**: reactivar con controles y disclaimer específico si hay licencia válida y revisión de copy firmada.
  - **C**: sustituir por operadores con título habilitante DGOJ.
- [ ] Redactar el disclaimer definitivo para `PartnerExternalNotice` en la card KeyDrop.

## Bloque 2 — R2: fiscalidad de premios en especie

- [ ] Definir umbrales de valor por premio y por usuario/mes que activan obligación de retención IRPF.
- [ ] Definir el flujo de comunicación AEAT como pagador de premios.
- [ ] Confirmar cómo se calcula la base imponible (valor de mercado al entregar) para skins.
- [ ] Añadir snapshot de valor + IVA cuando aplique en `redemptions`.

## Bloque 3 — R3: cláusulas contractuales

- [ ] §10 Términos: redactar limitación de responsabilidad que excluya daños indirectos sin caer en cláusula abusiva (RDL 1/2007 arts. 82–91).
- [ ] §11 Términos: retirar jurisdicción impuesta si es contraria al art. 90.2 TRLGDCU.

## Bloque 4 — R4: base jurídica del ranking público

- [ ] Elegir base jurídica: interés legítimo (art. 6.1.f RGPD) con opt-out ya implementado + test de ponderación documentado, o migrar a opt-in explícito (art. 6.1.a).
- [ ] Si opt-in: implementar checkbox al conectar Steam + banner para usuarios existentes.

## Bloque 5 — R5: menores y verificación de edad

- [ ] Redactar política sobre `+18` como requisito obligatorio.
- [ ] Aprobar el flujo técnico: `birthDate` en registro + bloqueo de participación/canje para `age < 18`.
- [ ] Redactar mensaje de "servicio no disponible para menores".

## Bloque 6 — Identidad legal y footer

- [ ] Confirmar razón social (persona física / SL) que aparecerá como responsable.
- [ ] NIF/CIF definitivo para publicar en `/legal`, `/privacidad`, `/sorteos/(legal)/*`.
- [ ] Domicilio fiscal para publicar en el footer y avisos legales.
- [ ] Nombre y contacto del DPO o representante RGPD (si aplica).
- [ ] Email dedicado tipo `legal@socialpro.es` (recomendado, actualmente se usa `marketing@`).

## Bloque 7 — Cookies

- [ ] Revisar tabla de cookies actuales (nombre, dominio, duración, finalidad, categoría) y publicarla en `/cookies`.
- [ ] Confirmar que ninguna cookie de terceros se establece antes del opt-in.

## Bloque 8 — Publicación

- [ ] Firma del abogado sobre el texto definitivo de: Términos, Privacidad, Cookies, Bases sorteos, Participación responsable, Recompensas y puntos, Aviso legal.
- [ ] Retirar `LegalDraftBanner` de todas las páginas legales publicadas.
- [ ] Retirar `robots: { index: false }` de las páginas legales una vez validadas.

## Convención

Cuando un bloque quede cerrado con firma, mover a "Cerrado" con fecha y responsable de la validación. Mantener este documento como changelog legal interno.

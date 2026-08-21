# Plan de retirada de Neon y Vercel

> **Solo con autorización expresa, y nunca antes de siete días estables.**

## Requisitos, todos

- [ ] Siete días en producción sobre el VPS sin incidentes
- [ ] Dos copias válidas y verificadas
- [ ] Una restauración completa probada **durante** la observación
- [ ] Vercel Blob copiado al 100 %
- [ ] **Cero lecturas por respaldo durante varios días seguidos**
- [ ] Crons ejecutándose y verificados
- [ ] Rollback del VPS probado
- [ ] Documentación al día

El de las lecturas por respaldo es el que más se olvida y el más importante:
mientras haya una sola, apagar Vercel Blob rompe un fichero que alguien usa.

```bash
docker logs socialpro-crm-app-1 2>&1 | grep -c "leído del respaldo"
```

## Orden

1. Exportar una última copia de Neon y guardarla fuera
2. Exportar una última copia de Vercel Blob
3. Descargar métricas e histórico que interese conservar
4. Desactivar los crons de Vercel *(esto ya debería estar hecho en el cutover)*
5. Quitar la integración de despliegue duplicada
6. **Archivar** Neon — archivar antes que borrar
7. Retirar el proyecto de Vercel
8. Rotar las credenciales antiguas
9. Quitar `@neondatabase/serverless` del proyecto
10. Quitar `@vercel/blob` **solo tras cerrar el respaldo**
11. Actualizar README y runbooks
12. Medir el ahorro real

## Lo que no se hace

- **No se borran cuentas completas** de Vercel o Neon: pueden contener otros
  proyectos.
- No se retira `@vercel/blob` mientras el respaldo siga activo.
- No se rotan secretos de identidad (`BETTER_AUTH_SECRET`,
  `TOKEN_ENCRYPTION_KEY`) en la misma ventana: eso va aparte, y el segundo
  descifra datos ya guardados.

## Ahorro esperado

| Concepto | Antes | Después |
|---|---|---|
| Neon | de pago — 70,61 $ solo en ramas en julio | 0 |
| Vercel | de pago | 0 |
| Vercel Blob | de pago | 0 |
| VPS | ya contratado | igual + ampliación |

El número real se cierra en `10-final-report.md` con facturas delante, no con
estimaciones.

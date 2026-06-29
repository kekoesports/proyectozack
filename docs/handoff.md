# Handoff — Sprint Permisos: rol admin_limited_tasks + guards tareas

**Sesión:** 2026-06-29  
**Estado al cerrar:** ✅ COMPLETO. Código en producción (`0b33910`) y rol de Alfonso actualizado y verificado en DB.

---

## 1. Commit de esta sesión

| Commit | Descripción |
|---|---|
| `0b33910` | feat(auth): add admin_limited_tasks role with task ownership guards (#113) |

---

## 2. Qué se implementó

### Rol `admin_limited_tasks`

- **Permisos:** copia de admin en los 18 módulos CRM (noticias, sorteos, talentos, campañas, facturación, bancos, contratos, etc.)
- **Restricción de tareas:** solo ve / edita / completa / elimina sus propias tareas (owner o assignee)
- **Sin hardcode por email/nombre** — el rol es el único mecanismo

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/auth-guard.ts` | `admin_limited_tasks` añadido a `Role`, `ROLES`, `homeForRole → '/admin'` |
| `src/lib/permissions.ts` | `canSeeAll`, `canDelete` + todos los módulos del PERMISSIONS map |
| `src/lib/queries/crmTasks.ts` | Nueva query `getTasksByIds`; `isAssignableTaskUser` incluye el nuevo rol |
| `src/app/admin/(dashboard)/tareas/actions.ts` | Guards de ownership en 5 actions; `resetRolledOver` callerId para todos los no-admin |
| `src/app/admin/(dashboard)/equipo/page.tsx` | Filtro equipo: solo `admin` y `manager` ven todos los cards |
| `src/__tests__/server/task-ownership.test.ts` | 12 tests nuevos (T1–T12, todos verdes) |

### Guards implementados

- `updateTaskAction` — verifica propiedad para `role !== 'admin'`
- `updateTaskPartialAction` — ídem
- `completeTaskAction` — ídem
- `deleteTaskAction` — ídem
- `bulkDeleteTasksAction` — rechaza TODO el lote si cualquier tarea es ajena; también añade `assertCanDelete` (managers ya no pueden bulk delete)
- `resetRolledOverAction` / `resetRolledOverBulkAction` — `callerId` para todos los no-admin (antes solo `staff`)

### Garantías de seguridad confirmadas

1. NO lista todas las tareas — `visibilityCondition` activo para `role !== 'admin'`
2. NO acceso por URL directa a tarea ajena — no existe página de detalle individual
3. NO edita tareas ajenas — guards en `updateTaskAction` y `updateTaskPartialAction`
4. NO completa tareas ajenas — guard en `completeTaskAction`
5. NO borra tareas ajenas — guards en `deleteTaskAction` y `bulkDeleteTasksAction`
6. SÍ borra sus propias tareas
7. SÍ tiene acceso admin en todos los demás módulos

---

## 3. ✅ Cambio de rol de Alfonso — APLICADO Y VERIFICADO

Ejecutado el 2026-06-29. Script `set-alfonso-role.ts` aplicó el UPDATE y leyó de vuelta el rol para confirmar.

| Campo | Valor |
|---|---|
| Email | `arias@socialpro.es` |
| Nombre | Alfonso Arias |
| Rol anterior | `manager` |
| Rol actual | `admin_limited_tasks` |
| Filas afectadas | 1 |
| `check-alfonso-role.ts` | ✅ OK |

**Ningún otro usuario fue modificado.** Roles del resto del equipo intactos:
- `admin@socialpro.es` → `admin`
- `rsnoverwatch@gmail.com` → `staff`
- `pcamacho@socialpro.es` → `manager`

**Permisos resultantes de Alfonso:**
- Acceso admin en todos los módulos CRM fuera de tareas ✅
- Tareas: solo ve / edita / completa / elimina las propias (owner o assignee) ✅

---

## 4. Nota menor — UI plantillas

`tareas/plantillas/page.tsx` tiene un check de UI hardcodeado:
```typescript
canDelete={canDelete(session.user.role === 'admin' ? 'admin' : 'manager')}
```
Resultado: `admin_limited_tasks` no ve el botón eliminar en plantillas (pero la server action sí aceptaría la petición). Inconsistencia cosmética de UI. Corregible en fix aparte si se desea.

---

## 5. Norma de proceso (vigente)

Push directo a master **prohibido** para cambios que:
- Borren datos / modifiquen producción / toquen auth o migraciones
- Afecten finanzas, invoices, conciliación, permisos o deploy

En esos casos: **branch → PR → CI verde → informe pre-merge → confirmación antes de mergear**.

---

## 6. Scripts de diagnóstico (no commiteados, desechables)

En `/scripts/`:
- `check-alfonso-role.ts`
- `qa-tracker-42.ts`
- `debug-keydrop-sheet.ts`, `debug-tracker-hyperlinks.ts`, `fix-tracker-count.ts`, `cleanup-tracker-duplicates.ts`

Pueden eliminarse cuando sea conveniente.

---

## 7. Próximos pasos

1. **QA manual con la cuenta de Alfonso** (`arias@socialpro.es`):
   - Iniciar sesión y confirmar acceso completo a campañas, talentos, finanzas, etc.
   - En `/admin/tareas`: verificar que solo ve sus propias tareas
   - Intentar editar/completar/borrar una tarea de otro usuario → debe recibir error
   - Confirmar que puede gestionar sus propias tareas sin restricciones

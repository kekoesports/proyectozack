# Feature · admin/ai-assistant

> Zack Operaciones combina conversación basada en datos verificados del CRM
> con un centro de mando para los agentes operativos.

## Modos

- Consulta: el modelo solo puede leer herramientas permitidas por rol. Entre
  ellas está el resumen de rendimiento de talentos.
- Orden: `/crm`, `/tratos`, `/growth` y `/seo` preparan una ejecución del agente
  correspondiente.

## Seguridad de las órdenes

1. El usuario redacta el objetivo.
2. La interfaz exige revisarlo y confirmarlo de forma explícita.
3. La API valida el permiso `agents:write`, la propiedad de la conversación y
   usa una clave idempotente para impedir duplicados.
4. El objetivo se registra sin correos, teléfonos ni secretos escritos en el
   texto.
5. Envíos, publicaciones y cambios sensibles conservan el flujo de aprobación
   independiente del Agent OS.

Zack no se reentrena copiando información sensible. Se apoya en consultas
autorizadas a la información actual del CRM y en el registro auditable de cada
ejecución.

---
summary: 'Arquitectura de marca, dominio y producto para KekoPilot sin mezclar el SaaS futuro con el CRM operativo de SocialPro.'
read_when:
  - Planning kekopilot.com
  - Creating the KekoPilot landing or SaaS
  - Deciding repositories, entities or domains
---

# KekoPilot — arquitectura de producto y dominio

## Decisión

`kekopilot.com` no será solo una pantalla de acceso. Tendrá dos superficies
separadas:

1. una web pública visual que explique el producto y genere confianza;
2. un panel SaaS privado, multiempresa y protegido, donde operen los agentes.

SocialPro seguirá siendo la agencia y su CRM seguirá siendo la aplicación
operativa preexistente. Zack seguirá siendo la familia de agentes. KekoPilot
será la marca del producto que permita usar esas capacidades como plataforma.

## Mapa de dominios

| Dominio | Función | Fase |
| --- | --- | --- |
| `kekopilot.com` | Web pública, casos de uso, seguridad, demostraciones y captación | Prelanzamiento |
| `app.kekopilot.com` | Panel SaaS autenticado y multi-tenant | Después de Gate 1 |
| `docs.kekopilot.com` | Documentación de producto e integraciones | Cuando exista API estable |
| `status.kekopilot.com` | Estado de servicios e incidencias | Antes de clientes de pago |
| `api.kekopilot.com` | API versionada | Después de separar el core |

## Contenido público mínimo

- propuesta: un sistema operativo de agentes para operaciones comerciales;
- módulos: Agent OS, Creator Intelligence, Lead Intelligence, Campaign
  Intelligence y Revenue Intelligence;
- casos reales explicados sin exponer datos privados de SocialPro;
- demostración visual con datos ficticios;
- seguridad, permisos, auditoría y aprobaciones humanas;
- lista de espera y contacto;
- aviso legal, privacidad, cookies y entidad responsable real.

La landing puede construirse ya como activo comercial independiente y sin
copiar datos internos. No debe contener todavía afirmaciones de que existe una
Cyprus Ltd ni de que la plataforma cumple o ha sido aprobada para IP Box.

## Límite antes del core

El núcleo nuevo del SaaS no debe comenzar bajo una entidad elegida por
conveniencia antes de cerrar:

- titular económico futuro;
- contratos y cesiones de todos los desarrolladores;
- tratamiento del baseline SocialPro;
- residencia, sustancia y dirección efectiva;
- valoración y operaciones vinculadas;
- criterio coordinado de asesores de España y Chipre.

Cuando se cierre ese gate, el producto tendrá repositorio privado propio,
aislamiento por organización, RBAC, auditoría, facturación SaaS y una API de
eventos para consumir capacidades del CRM sin reescribirlo.

## Propiedad y trazabilidad

El registro de `kekopilot.com` a nombre de PLAYMAKER MEDIA LLC acredita el
control del dominio, no la propiedad del software. Cualquier código, diseño,
contrato o coste nuevo debe registrarse con la entidad que realmente lo encarga,
paga y controla. Una transferencia futura deberá documentarse a valor de
mercado y con revisión profesional.


---
id: 0003
estado: en proceso
autor: Yael Pilar Luque
fecha: 2026-05-01
titulo: Eliminación de Lockers
---

# TDD-0003: Eliminación de Lockers

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos eliminar permanentemente un Locker del sistema. La operación debe proteger la integridad referencial evitando eliminar un Locker que aún esté asignado a un socio.

### User Persona

- **Nombre**: Administrativo.
- **Necesidad**: Dar de baja Lockers. Necesita una advertencia antes de confirmar el borrado para evitar eliminaciones accidentales, y el sistema no debe permitirle borrar un Locker que todavía tiene un socio asignado.

### Criterios de Aceptación

- El sistema debe presentar una confirmación explícita antes de proceder con el borrado.
- El sistema debe validar que el Locker exista antes de intentar eliminarlo.
- El sistema **no debe permitir** eliminar un Locker cuyo status sea `Occupied` (tiene un socio asignado).
- Si el borrado es exitoso la tabla de base de datos debe actualizarse.



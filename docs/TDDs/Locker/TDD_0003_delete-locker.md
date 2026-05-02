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

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere el identificador, no se envía cuerpo en la petición.

- **Endpoint**: `DELETE /api/v1/lockers/:id`
- **Request Body**: `None`
- **Response**: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `LockerRepository` (Método `delete(id)` y `findById(id)`).
2. **Caso de Uso**: `DeleteLockerUseCase` (Verifica existencia y que el Locker no esté ocupado antes de delegar la eliminación).
3. **Adaptador de Salida**: Repositorio de base de datos (Eliminación usando el método `delete`).
4. **Adaptador de Entrada**: `LockerController` (Ruta HTTP `DELETE /api/v1/lockers/:id` que retorna status 204).


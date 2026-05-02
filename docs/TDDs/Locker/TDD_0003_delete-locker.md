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

## Casos de Borde y Errores

| Escenario                        | Resultado Esperado                                              | Código HTTP               |
| -------------------------------- | --------------------------------------------------------------- | ------------------------- |
| Locker inexistente            | Mensaje: "El Locker no existe"                               | 404 Not Found             |
| Locker con estado `Occupied` (ocupado)  | Mensaje: "No se puede eliminar un Locker con un socio asignado" | 409 Conflict           |
| Locker con estado `Maintenance`(en mantenimiento) o  `Available`(disponible)     | Eliminación permitida (no está asignado a ningún socio)         | 204 No Content            |                                           | 204 No Content            |
| Error de conexión a DB           | Mensaje: "Error interno, reintente más tarde"                   | 500 Internal Server Error |

## Plan de Implementación

1. Crear el endpoint DELETE para eliminar un Locker.
2. Validar que el Locker exista.
3. Validar que no esté asignado a ningún socio (status no sea "Occupied").
4. Borrar el Locker de base de datos.
5. Mostrar confirmación antes de borrar en el Frontend.

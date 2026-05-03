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
3. **Adaptador de Salida**: `PostgresLockerRepository` (Eliminación usando el método `delete`).
4. **Adaptador de Entrada**: `LockerController` (Ruta HTTP `DELETE /api/v1/lockers/:id` que retorna status 204).

## Casos de Borde y Errores

| Escenario                        | Resultado Esperado                                              | Código HTTP               |
| -------------------------------- | --------------------------------------------------------------- | ------------------------- |
| Locker inexistente            | Mensaje: "El Locker no existe"                               | 404 Not Found             |
| Locker con estado `Occupied` (ocupado)  | Mensaje: "No se puede eliminar un Locker con un socio asignado" | 409 Conflict           |
| Locker con estado `Maintenance`(en mantenimiento) o  `Available`(disponible)     | Eliminación permitida (no está asignado a ningún socio)         | 204 No Content            |                                           | 204 No Content            |
| Error de conexión a DB           | Mensaje: "Error interno, reintente más tarde"                   | 500 Internal Server Error |

## Plan de Implementación

1. Ampliar el puerto `LockerRepository` y `PostgresLockerRepository` con los métodos necesarios:
	- `findById(id)`
	- `delete(id)`
2. Implementar o ampliar la validación de negocio para asegurar que el Locker exista y que no esté en estado `Occupied`.
3. Implementar la lógica en `DeleteLockerUseCase` delegando la eliminación solo si las validaciones son correctas.
4. Crear el endpoint `DELETE /api/v1/lockers/:id` en `LockerController` y mapear errores de negocio a los códigos HTTP correspondientes (`404` y `409`).
5. Añadir el método `delete` al servicio Frontend de Lockers.
6. Enlazar el botón de eliminación en la vista correspondiente, agregando confirmación antes de ejecutar la llamada.

---
id: 0002
estado: en proceso
autor: Yael Pilar Luque
fecha: 2026-05-01
titulo: Asignación y Actualización de Lockers
---

# TDD-0002: Asignación y Actualización de Lockers

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos modificar un Locker existente: actualizar su ubicación, cambiar su estado de mantenimiento o asignarlo/desasignarlo de un socio.

### User Persona

- **Nombre**: Administrativo.
- **Necesidad**: Modificar datos de Lockers desde el panel: cambiar ubicación, marcar para mantenimiento o asignarlo a un socio. Por ejemplo, asignar un Locker disponible a quien lo solicitó, o liberarlo cuando lo devuelven. La mayor frustración sería que dos socios terminen asignados al mismo Locker por un error del sistema.

### Criterios de Aceptación

- El sistema debe validar que un Locker con status `Maintenance` no pueda asignarse a ningún socio.
- El sistema debe validar que un Locker con status `Occupied` no pueda asignarse a otro socio sin desasignarlo primero.
- El sistema debe validar que, si se cambia el numero de locker, este no pertenezca ya a otro Locker.
- Si la edición es correcta, debe retornar los datos actualizados del Locker.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial.

- **Endpoint**: `UPDATE /api/v1/lockers/:id`
- **Request Body** (`UpdateLockerRequest`) — todos los campos son opcionales:

```ts
{
    number?: number;
    location?: string;
    status?: 'Available' | 'Occupied' | 'Maintenance';
    member_id?: string | null;
}
```

- **Response** (`LockerResponse`) — `200 OK`:

```ts
{
    id: string;
    number: number;
    location: string;
    status: 'Available' | 'Occupied' | 'Maintenance';
    member_id: string | null;
}
```
### Componentes de Arquitectura Hexagonal

1. **Puerto**: `LockerRepository` (Método `update(id, data)`).
2. **Servicio de Dominio**: `LockerValidator` (Encargado de validar estado `Maintenance`, unicidad del numero de locker y coherencia entre `status` y `member_id`).
3. **Caso de Uso**: `UpdateLockerUseCase` (Orquesta la validación y llama al repositorio con transacción).
4. **Adaptador de Salida**: Repositorio de base de datos (Actualización usando el método `update` del ORM).
5. **Adaptador de Entrada**: `LockerController` (Ruta HTTP `PATCH /api/v1/lockers/:id` que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                              | Resultado Esperado                                           | Código HTTP               |
| -------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| Locker inexistente                  | Mensaje: "El Locker no existe"                            | 404 Not Found             |
| Asignar Locker en `Maintenance`     | Mensaje: "El Locker está en mantenimiento y no puede asignarse" | 409 Conflict        |
| Asignar Locker `Occupied` a otro    | Mensaje: "El Locker ya se encuentra ocupado"              | 409 Conflict              |
| Nuevo numero de locker ya usado por otro Locker | Mensaje: "Ya existe un Locker con ese número"         | 409 Conflict              |
| `member_id` con UUID no existente      | Mensaje: "El socio no existe"                                | 400 Bad Request           |
| Error de conexión a DB                 | Mensaje: "Error interno, reintente más tarde"                | 500 Internal Server Error |

## Plan de Implementación

1. Crear el endpoint PATCH para cambiar datos del Locker.
2. Validar que no pueda asignarse si está en Maintenance.
3. Validar que no pueda cambiar de socio si ya está Occupied.
4. Validar que el número sea único si se intenta cambiar.
5. Guardar los cambios y retornar el Locker actualizado.


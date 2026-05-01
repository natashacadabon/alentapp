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

- **Endpoint**: `UPDATE /api/v1/locker/:id`
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


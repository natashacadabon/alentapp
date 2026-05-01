---
id: 0001
estado: en proceso
autor: Yael Pilar Luque
fecha: 2026-05-01
titulo: Alta de Lockers
---

# TDD-0001: Alta de Lockers

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un administrativo registre un nuevo Locker físico del club en el sistema, asegurando que su número identificatorio sea único y que quede disponible para su posterior asignación a socios.

### User Persona

- **Nombre**: Administrativo.
- **Necesidad**: Ingresar al sistema los Lockers del vestuario cuando se incorporan nuevas unidades o al realizar la carga inicial del inventario. Necesita evitar duplicados de numeración ya que cada Locker tiene un número pintado en la puerta.

### Criterios de Aceptación

- El sistema debe validar que el número de Locker (`number`) sea único.
- El status inicial de un nuevo Locker debe ser `Available` por defecto.
- El campo `member_id` debe quedar en `null` al crear un Locker (aún no asignado).
- Al crear con éxito, el sistema debe retornar los datos del Locker creado con status `201 Created`.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Locker` con las siguientes propiedades y restricciones:

- `id`: Identificador único universal (UUID), generado automáticamente.
- `number`: Entero, único e indexado (`UNIQUE`). Representa el número físico del Locker.
- `location`: Cadena de texto que describe la ubicación dentro del club (ej: "Vestuario A - Fila 1").
- `status`: Enumeración (`Available`, `Occupied`, `Maintenance`). Valor por defecto: `Available`.
- `member_id`: UUID foráneo nullable que referencia a `Member`. `null` indica que el Locker está libre.

### Contrato de API (@alentapp/shared)

- **Endpoint**: `POST /api/v1/lockers`
- **Request Body** (`CreateLockerRequest`):

```ts
{
    number: number;
    location: string;
}
```

- **Response** (`LockerResponse`) — `201 Created`:

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

1. **Puerto**: `LockerRepository` (Interface en el Dominio, método `create(data)`).
2. **Caso de Uso**: `NewLockerUseCase` (Verifica que el numero del locker no exista antes de delegar al repositorio).
3. **Adaptador de Salida**: Repositorio de base de datos (Persistencia con restricción de unicidad sobre numero de locker).
4. **Adaptador de Entrada**: `LockerController` (Ruta HTTP `POST /api/v1/locker`).

## Casos de Borde y Errores

| Escenario                        | Resultado Esperado                                  | Código HTTP               |
| -------------------------------- | --------------------------------------------------- | ------------------------- |
| Número de Locker ya existente | Mensaje: "Ya existe un Locker con ese número"    | 409 Conflict              |
| Numero de locker negativo o cero         | Mensaje: "El número de Locker debe ser positivo" | 400 Bad Request           |
| Locacion vacía o ausente       | Mensaje: "La ubicación es obligatoria"              | 400 Bad Request           |
| Error de conexión a DB           | Mensaje: "Error interno, reintente más tarde"       | 500 Internal Server Error |



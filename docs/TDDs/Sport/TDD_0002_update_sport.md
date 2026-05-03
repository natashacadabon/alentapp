---
id: 0002
estado: En proceso
autor: Yanina Fátima Ester Martínez
fecha: 2026-05-01
titulo: Actualización de Deporte
---

# TDD-0005: Actualización de Deporte

## Contexto de Negocio (PRD)

### Objetivo

Permitir la modificación parcial de un deporte existente en el sistema, restringiendo los campos editables únicamente a la descripción y la capacidad máxima, garantizando que el nombre del deporte permanezca inmutable.

### User Persona

*   **Nombre**: Administrador
*   **Necesidad**: Como administrador, quiero modificar la descripción y el cupo máximo de un deporte ya registrado, sin alterar su nombre original para mantener la información del deporte actualizada.


### Criterios de Aceptación

*   El sistema solo debe permitir modificar los campos `description` y `max_capacity`.
*   El sistema no debe permitir modificar el campo `name`.
*   Si se provee `max_capacity`, el sistema debe validar que sea mayor a cero.
*   El sistema debe retornar el deporte actualizado al finalizar la operación.

## Diseño Técnico (RFC)

### Modelo de Datos

No se realizan cambios en el esquema. Se utiliza la entidad `Sport` existente.

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Los campos editables son opcionales ya que se trata de una actualización parcial. El campo `name` es inmutable y no forma parte del contrato de actualización (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

*   **Endpoint**: `PUT /api/v1/sport/:id`
*   **Request Body**:
```ts
{
    description?: string;
    max_capacity?: number;
}
```
*   **Response Body**: `200 OK` en caso de éxito.
```ts
{
    id: string;
    name: string;
    description?: string;
    max_capacity: number;
    additional_price: number;
    requires_medical_certificate: boolean;
}
```

### Componentes de Arquitectura Hexagonal

*   **Domain**: 
        - Puerto `SportRepository` (Interface en el Dominio).
        - Servicio `SportValidator` (Encargado de reutilizar validaciones sobre `max_capacity > 0`)
*   **Application**: Caso de Uso `UpdateSportUseCase` (Orquesta la validación y delega la persistencia al repositorio).

*   **Infrastructure**: 
        - Adaptador de Salida: `PostgresSportRepository` (Implementa la interface `SportRepository` con la persistencia real en BD, usando el método `update` de Prisma).
        - Adaptador de Entrada: `SportController` (Expone la ruta HTTP y mapea excepciones a códigos HTTP).


## Casos de Borde y Errores

| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Deporte no existe | Mensaje: "El deporte indicado no se encuentra registrado" | 404 Not Found |
| Capacidad máxima inválida | Mensaje: "La capacidad máxima debe ser mayor a cero" | 400 Bad Request |
| Se envía un campo no permitido (`name`) | Mensaje: "El nombre del deporte no puede modificarse" | 400 Bad Request |
| Error de conexión a DB | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |        |

## Plan de Implementación

## Plan de Implementación

1. Definir el tipo `UpdateSportRequest` en el paquete `@alentapp/shared`.
2. Extender el puerto `SportRepository` con el método `update(id, data)`.
3. Implementar la lógica en `UpdateSportUseCase`, delegando validaciones en `SportValidator`.
4. Incorporar las validaciones de negocio `max_capacity > 0` e inmutabilidad del campo `name`.
5. Implementar el método `update` en `PostgresSportRepository`.
6. Crear la ruta `PUT /api/v1/sport/:id` en `SportController` y vincularla al caso de uso.
7. Añadir el método `update` al servicio Frontend.
8. Crear el formulario de edición en React exponiendo solo los campos `description` y `max_capacity`.
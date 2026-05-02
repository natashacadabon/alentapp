---
id: 0004
estado: En proceso
autor: Yanina Fatima Ester Martinez
fecha: 2026-04-30
titulo: Registro de Nuevo Deporte
---

# TDD-0004: Registro de Nuevo Deporte 

## Contexto de Negocio (PRD)

### Objetivo

Permitir el registro de nuevos deportes en el sistema, garantizando que el deporte tenga una capacidad máxima válida y que su nombre sea único e inmutable al momento de su creación.

### User Persona

*   **Nombre**: Administrador
*   **Necesidad**: Como administrador, quiero registrar un nuevo deporte en el sistema para que los socios puedan inscribirse en él, asegurando que la capacidad máxima sea un valor válido mayor a cero. 

### Criterios de Aceptación

*   El sistema debe validar que el campo `max_capacity` debe ser obligatorio y mayor a cero.
*   El sistema debe validar que el campo `name` debe ser obligatorio y único en el sistema. 
*   El campo `name` queda registrado como inmutable desde su creación.
*   Al finalizar, el sistema debe mostrar un mensaje de éxito y el deporte debe quedar registrado y disponible para futuras inscripciones.

## Diseño Técnico (RFC)

### Modelo de Datos

Se define la entidad `Sport` con las siguientes propiedades y restricciones:
*   `id`: Identificador único universal (UUID).
*   `name`: Cadena de texto única (string).
*   `description`: Cadena de texto opcional (string).
*   `max_capacity`: Número entero mayor a cero (int).
*   `additional_price`: Precio adicional (float).
*   `requires_medical_certificate`: Booleano, indica si requiere certificado médico (boolean).

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

*   **Endpoint**: `POST /api/v1/sport`
*   **Request Body**:
```ts
{
    name: string;
    description?: string;
    max_capacity: number;
    additional_price: number;
    requires_medical_certificate: boolean;
}
```
*   **Response Body**: `201 Created` en caso de éxito.
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

* **Domain**: 
    - Entidad `Sport` con la validación de `max_capacity > 0` y la restricción de inmutabilidad de `name`
    - Puerto `SportRepository` (Interface en el Dominio).
* **Application**: Caso de uso `CreateSport` (Orquesta la validación de las reglas de negocio y delega la persistencia al repositorio).
* **Infrastructure**: 
    - Adaptador de Salida: `PostgresSportRepository` (implementa la interface `SportRepository` con la persistencia real en BD).
    - Adaptador de Entrada: `SportController` (expone la ruta HTTP y delega el caso de uso).

## Casos de Borde y Errores

| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Capacidad máxima inválida     | Mensaje: "La capacidad máxima debe ser mayor a cero"       | 400 Bad Request              |
| Nombre ya existente | Mensaje: "Ya existe un deporte con ese nombre"         | 409 Conflict          |
| Nombre sin definir  | Mensaje: "El nombre del deporte es obligatorio"         | 400 Bad Request          |
| Capacidad máxima sin definir  | Mensaje: "La capacidad máxima es obligatoria"         | 400 Bad Request          |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |       |

## Plan de Implementación

1. Crear el esquema de la entidad `Sport` para la persistencia y correr la migración.
2. Definir los tipos `CreateSportRequest` y `SportDTO` en `@alentapp/shared`.
3. Implementar la entidad y las reglas de negocio en el Domain.
4. Definir el puerto `SportRepository` en domain e implementar el caso de uso `create`.
5. Implementar el repositorio `PostgresSportRepository` en infrastructure.
6. Crear el controlador `SportController` con la ruta `POST /api/v1/sport`.
7. Añadir el método `create` al servicio Frontend.
9. Crear el formulario en React y conectar con el endpoint del backend.
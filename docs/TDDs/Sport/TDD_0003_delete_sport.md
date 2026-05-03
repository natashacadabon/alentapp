---
id: 0003
estad0: En Proceso
autor: Yanina Fátima Ester Martínez
fecha: 2026-05-01
titulo: Eliminación de Deporte
---

# TDD-0006: Eliminación de Deporte

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos eliminar un deporte del sistema, removiendo su registro de la base de datos para mantener el catálogo de deportes actualizado y libre de registros incorrectos.

### User Persona

*   **Nombre**: Administrador
*   **Necesidad**: Como administrador, quiero eliminar un deporte cargado por error o que ya no se dicta en el club, contando con una advertencia previa para evitar eliminaciones accidentales.

### Criterios de Aceptación

*   El sistema debe pedir una confirmación explícita antes de proceder con el borrado.
*   El sistema debe validar que el deporte exista antes de intentar eliminarlo.
*   El sistema debe realizar un borrado físico de la base de datos (hard delete).
*   Si el borrado es exitoso, el catálogo de deportes debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

*   **Endpoint**: `DELETE /api/v1/sport/:id`
*   **Request Body**: `None`
*   **Response**: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

*   **Domain**: Puerto `SportRepository` (Método `delete(id)`).
*   **Application**: Caso de uso `DeleteSportUseCase` (Comprueba existencia previa vía `findById` y delega la eliminación).
*   **Infrastructure**:
    - Adaptador de Salida: `PostgresSportRepository` (Eliminación usando el método `delete` de Prisma).
    - Adaptador de Entrada: `SportController` (Ruta HTTP que extrae el `id` y devuelve status 204).

## Casos de Borde y Errores

| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Deporte inexistente | Mensaje: "El deporte no existe" | 404 Not Found |
| Error de conexión a DB | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Agregar el método `delete` en el puerto `SportRepository` y en `PostgresSportRepository`.
2. Implementar la lógica en `DeleteSportUseCase`.
3. Agregar el endpoint `DELETE /api/v1/sport/:id` en `SportController`.
4. Añadir el método `delete` al servicio Frontend.
5. Enlazar el botón de eliminación en la vista correspondiente agregando confirmación antes de ejecutar la llamada.
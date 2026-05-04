---
id: 0003
estado: Propuesto
autor: Dana Natasha Cadabon
fecha: 2026-04-30
titulo: Anulación de Pago
---

# TDD-0003: Anulación de Pago

## Contexto de Negocio (PRD)

### Objetivo

Anular una obligación financiera existente sin eliminar físicamente el registro, garantizando que el historial financiero del socio se conserve por motivos de auditoría y trazabilidad.

### User Persona

* **Nombre:** Alberto
* **Rol**: Tesorero
* **Necesidad**: Necesita anular pagos registrados por error o que ya no correspondan, sin perder el historial financiero del socio ni eliminar información relevante para la administración del club.

### Criterios de Aceptación

* El sistema debe permitir anular un pago existente.
* El sistema no debe eliminar físicamente el registro de la base de datos.
* Al anular un pago, el sistema debe actualizar su `status` a `Cancelado`.
* El sistema no debe permitir modificar datos estructurales del pago como `member_id`, `amount`, `month`, `year` o `due_date`.
* El sistema no debe permitir anular un pago inexistente.
* Si el pago ya se encuentra en estado `Cancelado`, el sistema debe evitar repetir la operación.
* Al finalizar correctamente, el sistema debe conservar el pago en el historial financiero del socio con estado `Cancelado`.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

* **Endpoint**: `PATCH /api/v1/payments/:id/cancel`
* **Request Body**: `None`
* **Response**: `200 OK`

```ts
export interface CancelPaymentResponse {
  id: string;
  member_id: string;
  amount: number;
  month: number;
  year: number;
  due_date: string;
  status: "Pendiente" | "Pagado" | "Vencido" | "Cancelado";
  payment_date: string | null;
}
```

### Componentes de Arquitectura Hexagonal

La lógica se distribuye en capas para separar las reglas de negocio de los detalles técnicos de entrada, salida y persistencia.

* **Domain**:
  - Entidad: `Payment`.
  - Reglas de negocio asociadas:
    - No se permite el borrado físico de pagos.
    - Un pago solo puede darse de baja cambiando su `status` a `Cancelado`.
    - No se deben modificar datos estructurales del pago como `member_id`, `amount`, `month`, `year` o `due_date`.
    - El pago anulado debe conservarse en el historial financiero del socio.
    - No se debe permitir anular un pago inexistente.
    - No se debe repetir la anulación de un pago que ya está en estado `Cancelado`.

* **Application**:
  - **Caso de uso**: `CancelPaymentUseCase`.
  - **Puerto de salida**: `PaymentRepository`.
    - Permite buscar el pago por `id`.
    - Permite actualizar el `status` del pago a `Cancelado`.
  - **Servicio de dominio**: `PaymentValidator`.
    - Valida que el pago exista.
    - Valida que el pago no se encuentre ya cancelado.
    - Valida que la operación no modifique campos estructurales.

* **Infrastructure**:
  - **Adaptador de entrada**: `PaymentController`.
    - Expone la ruta `PATCH /api/v1/payments/:id/cancel`.
    - Extrae el `id` desde la URL.
    - Invoca el caso de uso `CancelPaymentUseCase`.
    - Devuelve la respuesta HTTP correspondiente.
  - **Adaptador de salida**: `PostgresPaymentRepository`.
    - Implementa el puerto `PaymentRepository`.
    - Busca el pago por `id`.
    - Actualiza únicamente el campo `status` a `Cancelado`.
    - Persiste el cambio en la base de datos sin eliminar el registro.

## Casos de Borde y Errores

| Escenario | Resultado Esperado | Código HTTP |
|---|---|---|
| Pago inexistente | El sistema debe informar que el pago indicado no existe. | 404 Not Found |
| Pago ya cancelado | El sistema debe informar que el pago ya se encuentra cancelado. | 409 Conflict |
| Intento de borrado físico | El sistema debe impedir la eliminación física del registro. | 405 Method Not Allowed |
| Intento de modificar campos estructurales | El sistema debe rechazar cambios sobre `member_id`, `amount`, `month`, `year` o `due_date`. | 400 Bad Request |
| Error de infraestructura | El sistema debe informar un error interno si falla la conexión con la base de datos. | 500 Internal Server Error |

## Plan de Implementación

1. Crear el tipo `CancelPaymentResponse` en `@alentapp/shared`.
2. Ampliar el puerto `PaymentRepository` con los métodos necesarios:
   - `findById(id)`
   - `cancel(id)`
3. Implementar o ampliar `PaymentValidator` para validar que el pago exista y que no esté ya cancelado.
4. Implementar el caso de uso `CancelPaymentUseCase`.
5. Implementar el método `cancel(id)` en `PostgresPaymentRepository`, actualizando únicamente el campo `status` a `Cancelado`.
6. Crear la ruta `PATCH /api/v1/payments/:id/cancel`.
7. Mapear los errores del caso de uso a los códigos HTTP correspondientes.
8. Consumir el endpoint desde el frontend para permitir la anulación del pago.
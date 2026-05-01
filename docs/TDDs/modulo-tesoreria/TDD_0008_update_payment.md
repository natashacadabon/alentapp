---
id: 0008
estado: Propuesto
autor: Dana Natasha Cadabon
fecha: 2026-04-30
titulo: Actualización de Estado de Pago
---

# TDD-0008: Actualización de Estado de Pago

## Contexto de Negocio (PRD)

### Objetivo
Actualizar el estado de una obligación financiera existente, permitiendo reflejar si un pago fue abonado, vencido o cancelado, sin modificar los datos estructurales del registro original ni eliminar información del historial financiero del club.

### User Persona
* **Nombre:** Alberto
* **Rol**: Tesorero
* **Necesidad**: Necesita actualizar el estado de los pagos registrados para mantener reflejada la situación financiera de cada socio.

### Criterio de Aceptación
* El sistema debe permitir actualizar el estado de un pago existente.
* El sistema debe permitir cambiar el estado del pago a  `Pagado`, `Vencido` o `Cancelado`.
* El sistema no debe permitir modificar datos estructurales del pago como `memberId`, `monto`, `mesReferencia`, `anioReferencia` o `fechaVencimiento`.
* Si el pago se actualiza a estado `Pagado`, el sistema debe registrar una `fechaPago`.
* Si no se informa `fechaPago` al marcar el pago como `Pagado`, el sistema puede asignar automáticamente la fecha actual.
*  Si la `fechaVencimiento` ya fue superada y el pago no fue registrado como `Pagado`, el sistema debe actualizar el estado del pago a `Vencido`.
* Si el pago se actualiza a estado `Cancelado`, el registro debe conservarse en la base de datos y no debe eliminarse físicamente.
* El sistema no debe permitir actualizar un pago inexistente.
* El sistema debe validar que el nuevo estado sea válido.
* Al finalizar correctamente, el sistema debe guardar el nuevo estado del pago y devolver la información actualizada.

### Contrato de API (@alentapp/shared)
*   **Endpoint**: `PATCH /api/v1/payments/:id`
*   **Request Body**: (UpdateMemberRequest)
```ts
{
    estado?: "Pendiente" | "Pagado" | "Vencido" | "Cancelado";
    fechaPago?: string;

}
```

### Componentes de Arquitectura Hexagonal
La lógica se distribuye en capas para separar las reglas de negocios de los detalles técnicos de entrada, salida y persistencia.

*   **Domain**: 
    - Entidad:  `Payment`.
    - Reglas de negocio asociado:
        - No se debe poder modificar datos estructurales del registro del pago, como `monto`, `memberId`, `mesReferencia`, `anioReferencia` o `fechaVencimiento`.
        - Si el pago se actualiza a `Pagado`, debe registrarse una `fechaPago`.
        -  Si la  `fechaVencimiento` ya fue superada y el pago no fue registrado como `Pagado`, el sistema debe actualizar el estado del pago a `Vencido`.
        - Si al actualizar el estado a `Pagado` no se informa una `fechaPago` específica, el sistema debe utilizar la fecha actual automáticamente. 
        - Si el pago se actualiza a `Cancelado`, el registro debe       conservarse en la base de datos y no debe eliminarse físicamente.
        - No se debe permitir actualizar el estado de un pago inexistente. 

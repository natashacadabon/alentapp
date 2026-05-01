---
id: 0001
estado: Propuesto
autor: Dana Natasha Cadabon
fecha: 2026-04-30
titulo: Registro de Nuevo Pago
---

# TDD-0001: Registro de Nuevo Pago

## Contexto de Negocio (PRD)

### Objetivo
Registra cada obligación financiera que el socio tiene con la institución.

### User Persona
*   **Nombre**: Alberto (Tesorero)
*   **Necesidad**: Necesita registrar nuevos pagos u obligaciones financieras de los socios para mantener actualizado el historial económico del club y asegurar que cada operación quede correctamente asociada al socio correspondiente. No puede permitirse duplicar una cuota ya registrada, asociarla al socio incorrecto o registrar datos incompletos.

### Criterios de Aceptación
*   El sistema debe permitir registrar una nueva obligación financiera asociada a un socio existente. 
* El pago debe incluir obligatoriamente: `monto`, `mesReferencia`, `anioReferencia` y `fechaVencimiento`.
* El `monto` debe ser mayor a cero.
* El `mesReferencia` debe ser un mes válido.
* El `anioReferencia` debe ser un año válido. 
* El pago debe crearse con `estado` inicial `Pendiente`.
*  La `fechaPago` debe quedar vacía al momento de crear una obligación financiera pendiente.
* El sistema no debe permitir registrar el pago si el socio no existe.
* El sistema debe comprobar que el socio no tenga ya registrado un pago con mismo `mesReferencia` y `anioReferencia`, de existir no debe guardar el pago duplicado.
* Al finalizar correctamente, el sistema debe guardar el pago y dejarlo disponible en el historial financiero del socio.

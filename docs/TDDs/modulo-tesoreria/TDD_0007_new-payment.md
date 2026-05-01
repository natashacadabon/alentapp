---
id: 0007
estado: Propuesto
autor: Dana Natasha Cadabon
fecha: 2026-04-30
titulo: Registro de Nuevo Pago
---

# TDD-0007: Registro de Nuevo Pago

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

## Diseño Técnico (RFC)

### Modelo de Datos
Se definirá la entidad `Payment` con las siguientes propiedades y restricciones:
* `id`: Identificador único universal (UUID). Primary Key.
* `monto`: valor numérico decimal mayor a cero que representa el importe del pago.
* `mesReferencia`: número entero que indica el mes al que corresponde el pago. Debe ser un número entre 1 y 12.
* `anioReferencia`: número entero que indica el año al que corresponde el pago.
* `Estado`: Enumeración(`Pendiente`,`Pagado`,`Cancelado`)
* `fechaPago`: Fecha en la que se efectiviza el pago. En el alta inicial de una obligación financiera pendiente debe quedar en `null`.
* `memberId`: Identificador único universal (UUID) asociado al miembro. Foreign key. 

### Contrato de API (@alentapp/shared)

*   **Endpoint**: `POST /api/v1/payment`
*   **Request Body**:
```ts
export interface CreatePaymentRequest {
  memberId: string;
  monto: number;
  mesReferencia: number;
  anioReferencia: number;
  fechaVencimiento: string;
}
```
* **Response Body**:
```ts
export interface CreatePaymentResponse {
  id: string;
  memberId: string;
  monto: number;
  mesReferencia: number;
  anioReferencia: number;
  fechaVencimiento: string;
  estado: "Pendiente" | "Pagado" | "Cancelado";
  fechaPago: string | null;
}
```
### Componentes de Arquitectura Hexagonal
La lógica se distribuye en capas para separar las reglas de negocios de los detalles técnicos de entrada, salida y persistencia.

*   **Domain**: 
    - Entidad:  `Payment`.
    - Reglas de negocio asociado:
        - El `monto` debe ser mayor a cero.
        - El `mesReferencia` debe estar entre 1 y 12.
        - El pago debe crearse con estado inicial `Pendiente`.
        - La `fechaPago` debe quedar en `null` al crear una obligación financiera pendiente.
        - No debe existir otro pago para el mismo socio, mes y año de referencia.

*   **Application**: 
    - **Caso de uso**: `CreatePaymentUseCase`. (Orquesta la validación y llama al repositorio).
    - **Puertos de salida**: 
      - `PaymentRepository`: permite guardar el nuevo pago y consultar si ya existe un pago para el mismo socio, mes y año.
      - `MemberRepository`: permite verificar que el socio asociado exista.
    - **Servicio de Dominio**: `PaymentValidator` (Encargado de reutilizar las validaciones propias de la entidad `Payment`). 

*   **Infrastructure**: 
     - **Adaptador de entrada**: `PaymentController`. Expone la ruta `POST /api/v1/payments`. Recibe el request HTTP, invoca el caso de uso `CreatePaymentUseCase` y devuelve la respuesta HTTP correspondiente.
      - **Adaptador de salida**: `PrismaPaymentRepository`. Implementa el puerto `PaymentRepository`, persiste el nuevo pago en la base de datos y consulta si ya existe un pago para el mismo socio, mes y año de referencia.
    - **Adaptador de salida**: `PrismaMemberRepository`. Implementa el puerto `MemberRepository` para verificar la existencia del socio asociado antes de crear el pago.


## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Socio inexistente     | El sistema debe informar que el socio no se encuentra registrado       | 404 Not Found              |
| Campos obligatorios faltante | El sistema debe informar qué campos requeridos faltan: `memberId`, `monto`, `mesReferencia`, `anioReferencia` o `fechaVencimiento`.   | 400 Bad Request           |
| Monto inválido  | El sistema debe informar que el `monto` debe ser mayor a cero. | 400 Bad Request |
| Mes de referencia inválido | El sistema debe informar que el `mesReferencia` debe estar entre 1 y 12. | 400 Bad Request |
| Año de referencia inválido | El sistema debe informar que el `anioReferencia` no es válido. | 400 Bad Request |
| Fecha de vencimiento inválida | El sistema debe informar que la `fechaVencimiento` debe tener un formato válido. | 400 Bad Request |
| Pago duplicado | El sistema debe impedir registrar otro pago para el mismo socio, `mesReferencia` y `anioReferencia`. | 409 Conflict |
| Error de infraestructura | El sistema debe informar un error interno si falla la conexión con la base de datos. | 500 Internal Server Error |

## Plan de Implementación
1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Reutilizar el puerto existente `MemberRepository` para verificar que el socio asociado exista.
4. Crear formulario en React y conectar con el endpoint del backend.

---
id: 0002
estado: En proceso
autor: Lindon Sofia
fecha: 2026-05-01
titulo: Actualización de Certificados Médicos
---

# TDD-0002: Actualización de Certificados Médicos

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos corregir errores de tipeo o modificar información ingresada incorrectamente al momento de registrar un certificado médico en el sistema, asegurando la integridad de los datos clínicos del socio.

### User Persona

Como administrador quiero poder modificar datos de un certificado medico rapidamente para poder corregir errores cometidos al ingresar los datos sin la necesidad de dar de baja el registro completo.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno o varios campos permitidos del certificado (`issue_date`, `expiry_date`, `doctor_license`).
- El sistema NO debe permitir cambiar el socio asociado al certificado (`member_id` es inmutable).
- El sistema debe validar que, si se modifican las fechas, la fecha de vencimiento siga siendo estrictamente posterior a la fecha de emisión.
- El sistema no debe alterar el estado de vigencia (`is_validated`) mediante este endpoint, ya que eso se maneja en el alta de nuevos certificados.
- Si la edición es correcta, debe retornar los nuevos datos del certificado actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

- Endpoint: `GET /api/v1/medicalcertificate/:id`
- Response: Devuelve el objeto completo del certificado médico actual.
    {
    "id": "cert_001A",
    "member_id": "socio_1045",
    "issue_date": "2026-04-10T00:00:00.000Z",
    "expiry_date": "2027-04-10T00:00:00.000Z",
    "doctor_license": "MN 123456",
    "is_validated": true
    }

- Endpoint: `PUT /api/v1/medicalcertificate/:id`
- Request Body (UpdateMedicalCertificateRequest):
```ts
{
    issue_date?: Date;
    expiry_date?: Date;
    doctor_license?: string;
}
```

### Componentes de Arquitectura Hexagonal

Puerto: MedicalCertificateRepository (Método update(id, data)).
Servicio de Dominio: MedicalCertificateValidator (Encargado de validar la coherencia de las fechas y el formato de la matrícula).
Caso de Uso: UpdateMedicalCertificateUseCase (Orquesta la validación comprobando que el certificado exista y llama al repositorio).
Adaptador de Entrada: MedicalCertificateController (Ruta HTTP que extrae el id de la URL, recibe el body y mapea excepciones a códigos HTTP).
Adaptador de Salida: PostgresMedicalCertificateRepository (Actualización usando el método update del ORM en la base de datos).

### Caso de borde y errores

| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Certificado inexistente | Mensaje: "El certificado indicado no se encuentra registrado" | 404 Not Found    |
|Fechas inconsistentes| Mensaje: "La fecha de vencimiento debe ser posterior a la de emisión"  | 400 Bad Request  |
|Error de conexión| Mensaje: "Error interno, reintente más tarde"  | 500 Internal Server Error  |

### Plan de implementación

1.Actualizar las interfaces en el paquete @alentapp/shared (UpdateMedicalCertificateRequest).
2.Ampliar el MedicalCertificateRepository con el método update.
3.Implementar la lógica en UpdateMedicalCertificateUseCase añadiendo las validaciones de fechas correspondientes.
4.Crear la ruta PUT en el controlador asegurando que no se expongan campos restringidos.
5.Consumir el endpoint desde el servicio de Frontend y reutilizar el formulario para permitir la edición.
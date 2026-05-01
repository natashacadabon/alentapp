---
id: 00002
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

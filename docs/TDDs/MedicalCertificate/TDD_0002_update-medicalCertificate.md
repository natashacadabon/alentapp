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
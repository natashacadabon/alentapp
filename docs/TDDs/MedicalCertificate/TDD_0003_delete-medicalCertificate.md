---
id: 0003
estado: Implementado
autor: Lindon Sofia
fecha: 2026-05-01
titulo: Eliminación de certificado medico
---

# TDD-000X: Eliminación de Certificados Médicos Existentes

## Contexto de Negocio (PRD)

### Objetivo
Permitir al personal de administración dar de baja permanentemente un certificado médico del sistema, eliminando su registro de la base de datos para mantener el historial clínico limpio de documentos cargados por error, duplicados o asignados al socio equivocado.

### User Persona

   - **Nombre**: Administrativo.
   - **Necesidad** : Borrar un certificado médico que fue registrado por error, de forma rápida desde la tabla principal del perfil del socio. Necesita una advertencia antes de borrar para evitar eliminar un certificado válido accidentalmente.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado del documento.
- El sistema debe validar que el certificado médico exista antes de intentar borrarlo.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- Si el borrado es exitoso, la tabla de certificados en el perfil del socio debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)
Al tratarse de una operación destructiva que solo requiere conocer el identificador único del certificado, no se envía cuerpo en la petición HTTP.

- Endpoint: DELETE /api/v1/medical-certificates/:id
- Request Body: None
- Response: 204 No Content en caso de éxito.

### Componentes de Arquitectura Hexagonal

Puerto: MedicalCertificateRepository (Método delete(id)).
Caso de Uso: DeleteMedicalCertificateUseCase (Comprueba existencia previa vía findById y delega la eliminación).
Adaptador de Salida: PostgresMedicalCertificateRepository (Eliminación usando el método delete de Prisma o el ORM utilizado).
Adaptador de Entrada: MedicalCertificateController (Ruta HTTP que extrae el id y devuelve un status 204).
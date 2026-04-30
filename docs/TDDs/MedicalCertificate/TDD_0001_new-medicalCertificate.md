---
id: 0001
estado: En proceso
autor: Lindon Sofia
fecha: 2026-04-30
titulo: Registro de Nuevos Certificados
---

# TDD-0001: Registro de Nuevos Certificados

## Contexto del negocio (PRD)

### Objetivos

Permitir el registro digital de los aptos físicos (certificados médicos) de los socios, garantizando que el sistema mantenga un historial clínico pero asegurando que solo el certificado más reciente sea considerado como válido para las actividades del club.

### User Persona

- Nombre: Administrador
- Necesidad: Al recibir el certificado medico, necesita cargarlo rápidamente en el sistema y que la plataforma se encargue automáticamente de darle de baja al certificado del año anterior, sin tener que buscarlo.

### Criterio de aceptacion
- Solo puede haber un certificado activo por socio en el sistema.
- Al registrar un nuevo certificado, el sistema debe invalidar automáticamente cualquier registro anterior perteneciente a ese mismo socio.
- La matrícula del médico debe ser un campo necesario y obligatorio.
- El nuevo certificado debe guardarse con estado activo por defecto.
- El certificado ingresado debe estar asociado obligatoriamente a un socio validado en el sistema. 
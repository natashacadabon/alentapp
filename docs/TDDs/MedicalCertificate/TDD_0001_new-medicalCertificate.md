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

Como Administrador, quiero registrar un nuevo certificado médico en el sistema, para mantener el apto físico del socio al día y que el sistema invalide automáticamente cualquier certificado anterior.

### Criterio de aceptacion
- Solo puede haber un certificado activo por socio en el sistema.
- Al registrar un nuevo certificado, el sistema debe invalidar automáticamente cualquier registro anterior perteneciente a ese mismo socio.
- La matrícula del médico debe ser un campo necesario y obligatorio.
- El nuevo certificado debe guardarse con estado activo por defecto.
- El certificado ingresado debe estar asociado obligatoriamente a un socio validado en el sistema. 

## Diseño Técnico (RFC)

### Modelo de Datos

Se define la entidad 'Medical_Certificate' con las siguientes propiedades:

- `id`: Identificador único universal (UUID).
- `issue_date`: Fecha de emisión (date).
- `expiry_date`: Fecha de vencimiento (date).
- `doctor_license`: Cadena de texto, representa la matrícula del médico (string).
- `is_validated`: Booleano. Indica si es el certificado vigente (`true`) o uno histórico/invalidado (`false`)
- `member_id`: Clave foránea (UUID), relación con el socio.

### Contrato de API (@alentapp/shared)
Definicion de los tipos en el paquete compartido para asegurar sincronización entre el frontend y el backend:

- Endpoint: `POST /api/v1/medicalcertificate`
- Request Body (CreateMedicalCertificateRequest):
```ts
{
    member_id: string;
    issue_date: Date;
    expiry_date: Date;
    doctor_license: string;
}
```

### Componentes de Arquitectura Hexagonal

Puerto: MedicalCertificateRepository (Interface en el Dominio).
Caso de Uso: CreateMedicalCertificate (Orquesta la transacción: primero busca si el socio tiene un certificado activo, lo actualiza a is_validated = false, y luego guarda el nuevo con is_validated = true).
Adaptador de Salida: DB persistence adapter (Implementación de las consultas en la DB).
Adaptador de Entrada: MedicalCertificateController (Ruta HTTP que recibe el request).

### Caso de borde y errores

| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Socio no existe | Mensaje: "El socio indicado no se encuentra registrado" | 404 Not Found    |
|Fechas inconsistentes| Mensaje: "La fecha de vencimiento debe ser posterior a la de emisión"  | 400 Bad Request  |
|Falta matrícula médica| Mensaje: "La matrícula del médico es obligatoria"  | 400 Bad Request  |
|El socio ya tiene apto| Invalida el anterior (is_validated = false) y crea el nuevo (is_validated = true)  | 201 Created |
|Error de conexión| Mensaje: "Error interno, reintente más tarde"  | 500 Internal Server Error  |

### Plan de implementación

1.Crear el esquema de la entidad MedicalCertificate en la base de datos y correr la migración.
2.Definir los tipos (CreateMedicalCertificateRequest) en el paquete compartido.
3.Implementar el repositorio y la lógica en el caso de uso para garantizar que la actualización del registro viejo y la inserción del nuevo ocurran juntas sin fallas de integridad.
4.Crear el componente del formulario en React y conectarlo con el nuevo endpoint.
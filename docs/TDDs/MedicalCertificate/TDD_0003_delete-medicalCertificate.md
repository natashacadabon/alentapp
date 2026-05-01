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
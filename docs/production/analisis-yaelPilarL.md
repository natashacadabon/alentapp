# Fase 1: Analizar y proponer

---

## 1.1. Analizar la infraestructura Docker actual
- `docker-compose.yml` — configuración actual de servicios
- `packages/api/Dockerfile` — Dockerfile actual de la API
- `packages/web/Dockerfile` — Dockerfile actual del frontend

### Tabla de Problemas

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|----------|---|---|---|
| **Credenciales hardcodeadas en env** | `docker-compose.yml:6-8` (db service) | **ALTO** | Usar variables desde `.env`, Docker Secrets o gestor de secretos (Vault/AWS Secrets Manager) |
| **Caché de capas no optimizado** | `packages/api/Dockerfile:5-13`<br/>`packages/web/Dockerfile:5-11` | **MEDIO** | Reorganizar COPY statements: package.json primero, luego RUN npm install, finalmente COPY . . Crear `.dockerignore` |
| **Sin healthchecks en servicios** | `docker-compose.yml` servicios `api` y `web` (falta de healthcheck) | **MEDIO** | Agregar healthcheck con `curl http://localhost:3000/health`, implementar endpoint `/health` en API |
| **Sin límites de CPU/memoria** | `docker-compose.yml` servicios `db`, `api`, `web` (sin deploy limits) | **ALTO** | Agregar `deploy.resources.limits` y `deploy.resources.reservations` (DB: 1-2 CPU/2-4GB, API: 1 CPU/1-2GB, Web: 0.5 CPU/512MB) |
| **Volúmenes bind mount inseguros** | `docker-compose.yml:22-26` (api)<br/>`docker-compose.yml:50-54` (web) | **ALTO** | Usar volúmenes read-only (`:ro`), volúmenes nombrados para prod, o separar dev/prod en archivos diferentes |

---
### Detalle de Problemas

#### 1. Credenciales Hardcodeadas en Variables de Entorno

| Aspecto | Detalle |
|--------|--------|
| **¿Dónde ocurre?** | `docker-compose.yml`, líneas 6-8 (servicio `db`) |
| **Impacto** | **ALTO**  |
| **Archivos afectados** | `docker-compose.yml:6-8` |
| **Problema** | Las credenciales de PostgreSQL están expuestas en texto plano |

#### Código
```yaml
environment:
    POSTGRES_USER: admin
    POSTGRES_PASSWORD: password123
    POSTGRES_DB: alentapp_db
```

#### Vulnerabilidad
- Si el repositorio es comprometido, cualquiera tiene acceso a las credenciales de BD
- Las credenciales débiles (`password123`) no cumplen con estándares de seguridad
- Imposible auditar quién accede a las credenciales
- Si alguien tiene acceso a la imagen Docker, puede ver el historial de cómo fue construida, y ahí aparecen las contraseñas aunque ya no estén en el archivo actual

#### Soluciones

**Opción 1: Variables de entorno desde archivo .env**
```yaml
# docker-compose.yml
environment:
    POSTGRES_USER: ${DB_USER}
    POSTGRES_PASSWORD: ${DB_PASSWORD}
    POSTGRES_DB: ${DB_NAME}
```

```bash
# .env
DB_USER=admin
DB_PASSWORD=<generated-strong-password>
DB_NAME=alentapp_db
```

**Opción 2: Gestor de secretos**
- Más seguro para producción
- Rotación automática de credenciales
- Auditoría completa de acceso

---

#### 2. Caché de Capas Docker No Optimizado

| Aspecto | Detalle |
|--------|--------|
| **¿Dónde ocurre?** | `packages/api/Dockerfile` líneas 5-13 y `packages/web/Dockerfile` líneas 5-11 |
| **Impacto** | **MEDIO**  |
| **Archivos afectados** | `packages/api/Dockerfile` y `packages/web/Dockerfile` |
| **Problema** | Cambios en código invalidan la cache de `npm install` |

#### Código
```dockerfile
# packages/api/Dockerfile
COPY package*.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN npm install

COPY . .  # ← Esto es el problema
```

#### Vulnerabilidad
- Cuando se usa una herramienta que compila el proyecto automáticamente cada vez que se hace un commit, el build tarda mucho más porque reinstala todas las dependencias aunque el código no las haya cambiado.

#### Soluciones

**Opción 1: Reorganizar COPY statements**
```dockerfile
# packages/api/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Paso 1: Copiar SOLO los package.json
COPY package*.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Paso 2: Instalar dependencias
RUN npm install --production

# Paso 3: LUEGO copiar el código fuente
COPY . .

EXPOSE 3000
CMD ["npm", "run", "build", "-w", "packages/api"]
```

**Opción 2: Usar .dockerignore para excluir archivos innecesarios**
```
# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
dist
build
*.md
README.md
```

---

#### 3. Falta de Healthchecks en Servicios API y Web

| Aspecto | Detalle |
|--------|--------|
| **¿Dónde ocurre?** | `docker-compose.yml` servicios `api` y `web` (falta de `healthcheck`) |
| **Impacto** | **MEDIO** |
| **Archivos afectados** | `docker-compose.yml:24` (api) y `docker-compose.yml:47` (web) |
| **Problema** | Sin healthchecks, un contenedor puede estar "up" pero no respondiendo |

#### Código
```yaml
# docker-compose.yml
api:
    build: ...
    # SIN HEALTHCHECK
    
web:
    build: ...
    # SIN HEALTHCHECK
```

#### Vulnerabilidad
- El contenedor aparece como "corriendo" en Docker aunque la aplicación adentro haya fallado, porque Docker solo sabe que el proceso existe, no que está respondiendo bien.
- Si el contenedor falla sin que nadie lo note, los usuarios siguen mandando requests y todos les llegan con error.
- Nadie se entera del problema hasta que alguien lo revisa manualmente o un usuario se queja.

#### Soluciones Propuestas

**Opción 1: Healthcheck con curl**
```yaml
# docker-compose.yml
api:
    build:
        context: .
        dockerfile: packages/api/Dockerfile
    container_name: alentapp-api
    healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
        interval: 10s
        timeout: 5s
        retries: 3
        start_period: 40s  # Esperar a que la app inicie
    # ... resto de config

web:
    build:
        context: .
        dockerfile: packages/web/Dockerfile
    container_name: alentapp-web
    healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:5173/"]
        interval: 10s
        timeout: 5s
        retries: 3
        start_period: 30s
    # ... resto de config
```

**Opción 2: Healthcheck con wget**
```yaml
healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 40s
```
wget es una herramienta de línea de comandos para hacer requests HTTP

---

#### 4. Sin Límites de CPU y Memoria

| Aspecto | Detalle |
|--------|--------|
| **¿Dónde ocurre?** | `docker-compose.yml` - todos los servicios (líneas 1-65) |
| **Impacto** | **MEDIO-ALTO** |
| **Archivos afectados** | `docker-compose.yml` (servicios `db`, `api`, `web`) |
| **Problema** | Sin límites, un memory leak causa crash del sistema entero |

#### Código Problemático
```yaml
# docker-compose.yml
services:
    db:
        image: postgres:16-alpine
        # Sin límites de CPU/memoria
        
    api:
        build: ...
        # Sin límites de CPU/memoria
        
    web:
        build: ...
        # Sin límites de CPU/memoria
```

#### Vulnerabilidad
- Si hay un bug de memoria en la API, el contenedor se puede comer casi toda la RAM de la compu.
- Si la base de datos ejecuta una consulta pesada, puede dejar todo lento o trabado.
- Un servicio puede acaparar recursos y perjudicar a los otros contenedores.
- El sistema en general se vuelve inestable y responde peor.
- En un servidor compartido, este problema también puede afectar a otras apps o usuarios.

#### Soluciones

**Opción: Límites básicos en docker-compose**
```yaml
# docker-compose.yml - MEJORADO
services:
    db:
        image: postgres:16-alpine
        deploy:
            resources:
                limits:
                    cpus: '1'
                    memory: 1G
                reservations:
                    cpus: '0.5'
                    memory: 512M
        # ... resto de config

    api:
        build:
            context: .
            dockerfile: packages/api/Dockerfile
        deploy:
            resources:
                limits:
                    cpus: '1'
                    memory: 1G
                reservations:
                    cpus: '0.5'
                    memory: 512M
        # ... resto de config

    web:
        build:
            context: .
            dockerfile: packages/web/Dockerfile
        deploy:
            resources:
                limits:
                    cpus: '0.5'
                    memory: 512M
                reservations:
                    cpus: '0.25'
                    memory: 256M
        # ... resto de config
```

---

#### 5. SECURITY: Volúmenes Bind Mount Inapropiados

| Aspecto | Detalle |
|--------|--------|
| **¿Dónde ocurre?** | `docker-compose.yml` líneas 22-26 (api) y 50-54 (web) |
| **Impacto** | **ALTO** |
| **Archivos afectados** | `docker-compose.yml` (volúmenes de api y web) |
| **Problema** | Volúmenes bind mount exponen todo el código fuente del host |

#### Código 
```yaml
# docker-compose.yml 
api:
    volumes:
    # Monta todo el directorio de trabajo
        - /app/node_modules
    # ...

web:
    volumes:
        - .:/app  # Monta todo el directorio de trabajo
        - /app/node_modules
```

#### Vulnerabilidad
- Si montás todo el proyecto con bind mount, el contenedor puede tocar archivos de tu máquina.
- Si alguien rompe el contenedor, también puede acceder al código fuente del host.
- Es difícil saber exactamente qué archivo se modificó y cuándo.
- Se rompe la idea de darle al contenedor solo los permisos mínimos necesarios.
- El contenedor deja de ser inmutable, entonces cuesta más repetir errores y debuggear.
- En producción esto aumenta mucho el riesgo de seguridad.

#### Soluciones Propuestas

**Opción 1: Usar bind mounts READ-ONLY**
```yaml
# docker-compose.yml
api:
    volumes:
        - .:/app:ro  # ← READ-ONLY
        - /app/node_modules
    # Solo el código fuente es accesible, no modificable

web:
    volumes:
        - .:/app:ro  # ← READ-ONLY
        - /app/node_modules
```

**Opción 2: Usar volúmenes nombrados (mejor)**
```yaml
# docker-compose.yml 
volumes:
    api_data:
    web_data:

services:
    api:
        volumes:
            - api_data:/app/data  # Solo la data, no el código
        # Código viene en la imagen, no en volúmenes
        
    web:
        volumes:
            - web_data:/app/dist  # Solo outputs, no el código
```

---

## 1.2. Investigar OpenTelemetry

Analizar y documentar los siguientes aspectos sobre OpenTelemetry:

#### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry es un framework estándar para instrumentar aplicaciones y recolectar telemetría (métricas, logs y trazas). No almacena ni visualiza datos, solo los genera y exporta. Es agnóstico de proveedores, lo que significa que podés usar el mismo código para enviar datos a Prometheus, Jaeger, Grafana o cualquier otro backend sin cambiar tu instrumentación.


Prometheus, en cambio, es una solución completa de monitoreo: recolecta métricas, las almacena, visualiza y genera alertas. Solo trabaja con métricas (no soporta logs ni trazas nativamente) y usa un modelo de extracción (pull) donde hace requests periódicos a endpoints expuestos por las aplicaciones.


**Resumen de diferencias:**

| Aspecto | OpenTelemetry | Prometheus |
|---------|--------------|------------|
| Tipo | Framework de instrumentación | Solución completa de monitoreo |
| Qué recopila | Métricas, logs y trazas | Solo métricas |
| Almacenamiento | No, necesita un backend | Sí, almacena en su BD |
| Visualización | No, necesita una herramienta | Sí, tiene web UI integrada |
| Independencia | Agnóstico de proveedores | Cerrado a Prometheus |



---

#### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

En observabilidad, los 3 pilares son las señales que usamos para entender el estado real de un sistema:

- Métricas : valores numéricos en el tiempo.
- Logs : registros de eventos puntuales de la aplicación o infraestructura.
- Rastreos : seguimiento de una solicitud de punta a punta entre servicios.

OpenTelemetry aborda los tres pilares porque permite instrumentar y exportar estas tres señales de forma unificada.

---

#### Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?

El Método RED fue creado como una filosofía de monitoreo orientada a microservicios.

Para cada servicio, se monitorean:

- **Rate (Tasa):** la cantidad de solicitudes por segundo que recibe el servicio.
- **Errors (Errores):** la cantidad de esas solicitudes que están fallando.
- **Duration (Duración):** el tiempo que tardan esas solicitudes en completarse.

Además, el Método RED es un buen indicador de la satisfacción de los usuarios: una tasa de errores alta significa que los usuarios están viendo errores en sus páginas; una duración alta significa que el sitio es lento. Por eso son métricas muy útiles para construir alertas significativas.

---

#### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP es el protocolo estándar de OpenTelemetry para enviar telemetría (métricas, logs y trazas) desde la aplicación hacia un collector o un backend.

En términos simples, OTLP define dos cosas: el formato de los datos (Protocol Buffers) y cómo se transportan (gRPC o HTTP).

La ventaja frente a exportar directo a Prometheus es que OTLP desacopla la instrumentación del destino final: instrumentás una sola vez y después podés enrutar los datos a distintos backends (Prometheus, Jaeger, Grafana, etc.) sin reescribir la app.

Además, OTLP permite manejar en forma unificada las tres señales de observabilidad, mientras que Prometheus está más enfocado en métricas.

---

#### ¿Cómo se relaciona OpenTelemetry con Grafana?

OpenTelemetry ofrece herramientas de código abierto, SDKs y estándares independientes de proveedores para la observabilidad de aplicaciones. Esto encaja perfectamente con la estrategia de "gran carpa" de la plataforma de observabilidad de Grafana, que habilita la interoperabilidad y la libertad de elección. La capacidad de reunir telemetría de infraestructura y plataforma (como métricas de Prometheus desde Kubernetes) junto con la telemetría de aplicaciones en un único backend de monitoreo unificado y de código abierto, cierra la brecha entre los equipos de operaciones y los desarrolladores de aplicaciones, y abre nuevas formas de colaboración y análisis.


---




# 1.1 Análisis de la Infraestructura Docker Actual

### Descripción General

La infraestructura actual está compuesta por tres servicios principales:

- db: Base de datos PostgreSQL 16.
- api: Backend Node.js/TypeScript.
- web: Frontend React/Vite.

La arquitectura sigue un esquema de desarrollo local basado en Docker Compose, donde cada servicio se ejecuta en un contenedor independiente y se comunican mediante la red interna generada por Docker.

---

## Problema 1: Credenciales Hardcodeadas

El problema aparece porque las credenciales de la base de datos están escritas directamente dentro del archivo `docker-compose.yml`, quedando expuestas a cualquier persona con acceso al repositorio. 

Además, quedan versionadas en Git, quedando dentro del historial del repositorio. Esto obliga a realizar una rotación inmediata de claves. 


### ¿Dónde ocurre?

```yaml
environment:
  POSTGRES_USER: admin
  POSTGRES_PASSWORD: password123
```

### Impacto
**Alto.**

El impacto es alto porque una filtración del repositorio podría exponer directamente el acceso a la base de datos. Si además la base estuviera accesible desde una red externa o mal protegida, un atacante podría intentar conectarse usando esas credenciales.

### Solución Propuesta

La solución consiste en reemplazar los valores fijos por variables de entorno.

```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

Utilizar `.env`, que no debe subirse al repositorio.

---

## Problema 2: Uso de Volúmenes de Desarrollo en Producción
El problema se encuentra en el uso de un volumen tipo bind mount, donde el directorio actual del host se monta dentro del contenedor en la ruta /app.

Esta práctica es común en desarrollo porque permite modificar archivos en la máquina local y ver los cambios reflejados inmediatamente dentro del contenedor. Es útil para trabajar con hot reload, watch mode o recompilación automática.

Sin embargo, en producción no es recomendable. En un entorno productivo, el contenedor debería ejecutarse a partir de una imagen cerrada, construida previamente y sin depender del estado del sistema de archivos del host.

Cuando se monta el código fuente desde afuera, la imagen deja de ser inmutable. Esto significa que el contenido ejecutado por el contenedor puede cambiar después del despliegue, lo cual afecta la reproducibilidad y la confiabilidad del sistema.

### ¿Donde ocurre?

```yaml
volumes:
  - .:/app
```

### Impacto
**Alto.**

El impacto es alto porque se pierde control sobre qué versión exacta del código está corriendo en producción.

Esto puede provocar:
* Diferencias entre la imagen construida y el código realmente ejecutado.
* Cambios accidentales en archivos de producción.
* Mayor superficie de ataque.

### Solución Propuesta
En producción deben eliminarse los bind mounts.

```yaml
volumes: []
```

La imagen Docker debe contener todo lo necesario para ejecutar la aplicación: código compilado, dependencias de producción y configuración mínima.

La práctica recomendada es construir una imagen específica para producción y desplegar siempre esa imagen, evitando que el contenedor dependa de archivos externos del host.
---

## Problema 3: Ejecución en Modo Desarrollo

El problema se observa en que tanto la API como el frontend se ejecutan usando comandos propios de desarrollo.

API:

```bash
npx tsx watch packages/api/src/app.ts
```
`tsx watch` permite ejecutar TypeScript directamente y reiniciar el proceso cada vez que detecta cambios en los archivos. Esto es útil durante el desarrollo, pero no es adecuado para producción.

WEB:

```bash
npm run dev
```
`npm run dev` levanta el servidor de desarrollo de Vite. Este servidor está pensado para desarrollo local, no para servir una aplicación final a usuarios reales.

### ¿Donde ocurre?

`docker-compose.yml`

### Impacto
**Alto**

El impacto es alto porque ejecutar una aplicación en modo desarrollo dentro de producción afecta directamente el rendimiento, la estabilidad y la seguridad.

Puede generar: 
* Mayor consumo de CPU.
* Mayor consumo de memoria.
* Imágenes más pesadas por incluir dependencias de desarrollo.

Además, el servidor de desarrollo de Vite no está pensado para manejar tráfico productivo ni para aplicar las optimizaciones propias de un servidor web como Nginx.

### Solución Propuesta

La solución es compilar previamente la aplicación y ejecutar únicamente los artefactos finales.

Para la API:

```bash
npm run build
node dist/app.js
```
Esto implica transformar el código TypeScript en JavaScript antes de iniciar el contenedor productivo.

Para el frontend:
```bash
npm run build
```

Este comando genera una carpeta `dist` con archivos estáticos optimizados, que luego pueden ser servidos mediante Nginx.

La ventaja de esta solución es que en producción sólo se ejecuta código ya compilado, sin watch mode, sin hot reload y sin herramientas innecesarias.

---

## Problema 4: Imagen Base Pesada

El problema no está únicamente en usar node:20-alpine, ya que Alpine suele ser una base liviana. El problema principal es utilizar una única etapa para construir y ejecutar la aplicación.

Cuando se usa una sola etapa, la imagen final puede terminar incluyendo elementos que sólo son necesarios durante la construcción, pero no durante la ejecución. Como dependencias de desarrollo, herramientas de build, codigo fuente completo, archivo temporales, configuraciones innecesarias, etc. 

### ¿Donde ocurre?

```dockerfile
FROM node:20-alpine
```
### Impacto
**Medio**
El impacto es medio porque no necesariamente impide que la aplicación funcione, pero afecta la eficiencia y la calidad del despliegue.
Una imagen más pesada implica: 
* Mayor tiempo de descarga.
* Mayor tiempo de despliegue.
* Mayor consumo de almacenamiento.
* Mayor superficie de ataque.
* Más dependencias que mantener.
* Escalado más lento en caso de necesitar levantar nuevas instancias.
### Solución Propuesta
La solución recomendada es implementar un Multi-Stage Build.

En una primera etapa, llamada comúnmente builder, se instalan dependencias y se compila la aplicación
```dockerfile
FROM node:20-alpine AS builder
```
En una segunda etapa, llamada runtime o producción, se copia únicamente el resultado de la compilación.

```dockerfile
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```
De esta manera, la imagen final no contiene Node.js, dependencias de desarrollo ni archivos fuente innecesarios. Sólo incluye Nginx y los archivos estáticos generados por el build.

---

## Problema 5: Ausencia de Restricciones de Recursos

El problema es que, si no se definen límites de recursos, los contenedores pueden consumir todos los recursos disponibles del host.

En una arquitectura con varios servicios, como base de datos, API y frontend, esto puede ser peligroso. Si un servicio tiene un error, una consulta pesada, un memory leak o un pico inesperado de tráfico, puede consumir demasiada memoria o CPU.

Esto puede afectar no sólo al contenedor problemático, sino también al resto de los servicios que corren en el mismo servidor.

### ¿Donde ocurre?
`docker-compose.yml`
### Impacto
**Medio-alto**
El impacto es medio-alto porque afecta directamente la disponibilidad del sistema.

Puede provocar:

* Lentitud general.
* Caídas de contenedores.
* Reinicios inesperados.
* Saturación del host.
* Afectación entre servicios.
* Pérdida temporal de disponibilidad.
* Dificultad para diagnosticar problemas de rendimiento.
### Solución propuesta: 
Se deben definir límites explícitos de CPU y memoria para cada servicio.
```yaml
deploy:
  resources:
    limits:
      cpus: "1"
      memory: 512M
```
# 1.2 Investigación sobre OpenTelemetry

## ¿Qué es OpenTelemetry?

OpenTelemetry (OTel) es un estándar abierto para la recolección de métricas, logs y trazas

Su objetivo es permitir que las aplicaciones produzcan telemetría de manera independiente de la plataforma utilizada para visualizarla o almacenarla.

Se encarga de: 
* Generar métricas.
* Generar trazas.
* Generar logs.
* Exportar telemetría

### Diferencia entre OpenTelemetry y Prometheus
Aunque OpenTelemetry y Prometheus suelen utilizarse juntos dentro de una arquitectura de observabilidad, cumplen funciones diferentes y complementarias.

La aplicación genera telemetría mediante OpenTelemetry.

Posteriormente la API utiliza el SDK de OpenTelemetry junto con `PrometheusExporter`, que expone las métricas directamente en el endpoint `/metrics` del puerto `9464`.

Prometheus recolecta esas métricas mediante scraping y Grafana consulta Prometheus para mostrar dashboards y paneles de monitoreo.

#### OpenTelemetry
OpenTelemetry (OTel) es un conjunto de estándares, APIs, SDKs y herramientas cuyo objetivo es generar, recopilar y exportar información de observabilidad desde una aplicación. Su objetivo es generar telemetría y enviarla a sistemas especializados que posteriormente la procesarán.
Su función principal es instrumentar el software para obtener datos sobre su comportamiento interno. Gracias a OpenTelemetry, una aplicación puede producir:
- Métricas.
- Logs.
- Trazas distribuidas (Distributed Tracing).
Las métricas se exponen directamente en formato compatible con Prometheus mediante `PrometheusExporter`. 


#### Prometheus

Prometheus es una plataforma de monitoreo y almacenamiento de métricas basada en series temporales.

Su principal función es recopilar, almacenar y consultar métricas generadas por aplicaciones, contenedores y sistemas de infraestructura

Se encarga de: 
* Almacenamiento de métricas.
* Consultas mediante PromQL.
* Generación de alertas.
* Monitoreo continuo de servicios.

A diferencia de OpenTelemetry, Prometheus no se enfoca en generar telemetría dentro de la aplicación. Su rol es recibir métricas ya generadas y almacenarlas para su posterior análisis.

|Aspecto	|OpenTelemetry	|Prometheus|
|---------|-----------|----------|
Objetivo principal|	Instrumentar aplicaciones|	Almacenar y consultar métricas
Genera métricas|	Sí	|No
Genera logs	|Sí	|No
Genera trazas	|Sí	|No
Almacena información	|No|	Sí
Permite consultas históricas	|No|	Sí
Genera alertas|	No|	Sí
Visualiza datos|	No|	No |
Protocolo principal|	PrometheusExporter en `/metrics` para esta implementación; OTLP como alternativa estándar	|Prometheus Scraping / Remote Write
### Tres pilares de la observabilidad: 

1. Métricas
2. Logs
3. Trazas

#### 1. Métricas 
Representan valores numéricos registrados a lo largo del tiempo. Es el comportamiento cuantitativo del sistema y permiten monitorear tendencias, detectar anomalías y evaluar el rendimiento de los distintos componentes de la aplicación.
#### 2. Logs
Los logs son registros textuales generados por la aplicación mientras se ejecuta. Cada log representa un evento específico ocurrido dentro del sistema y suele incluir información contextual como fecha, hora, nivel de severidad, usuario involucrado o detalles técnicos del evento.

Los logs suelen clasificarse según su nivel de severidad:
* INFO: eventos normales de operación.
* DEBUG: información detallada para desarrollo.
* WARN: situaciones potencialmente problemáticas.
* ERROR: errores que afectan una operación específica.
* FATAL: errores críticos que pueden detener la aplicación.
#### 3. Trazas
Las trazas permiten visualizar el recorrido completo de una solicitud a través de los distintos componentes de una arquitectura distribuida.

Cuando un usuario realiza una acción, la solicitud puede atravesar múltiples servicios antes de completarse. Una traza registra cada uno de esos pasos y el tiempo consumido en cada uno de ellos.

### Métricas RED
Uno de los enfoques más utilizados para monitorear APIs y servicios web es el método RED, propuesto por Tom Wilkie, ingeniero de Grafana Labs.

RED se basa en medir tres indicadores fundamentales que describen el comportamiento de cualquier servicio:
#### Rate (tasa): 
Representa la cantidad de solicitudes que recibe el sistema durante un período determinado. Generalmente se expresa como solicitudes por segundo (Requests Per Second - RPS).

Por ejemplo:

250 requests/segundo

Esta métrica permite medir la carga de trabajo que está soportando el sistema en un momento dado.

Su utilidad principal es detectar:

* Incrementos de tráfico.
* Horarios de mayor utilización.
* Sobrecarga de servicios.
* Ataques o comportamientos anómalos.
* Efectos de campañas o eventos que generen mayor cantidad de usuarios.
#### Errors: 
Representa la cantidad o porcentaje de solicitudes que finalizan con error.
Por ejemplo:

2 % de solicitudes con error HTTP 500

Esta métrica permite evaluar la confiabilidad y estabilidad del servicio.

Su utilidad principal es detectar:

* Fallos en la aplicación.
* Problemas de infraestructura.
* Errores introducidos por nuevos despliegues.
* Dependencias externas fuera de servicio.
* Problemas de configuración.

#### Duration: 

Representa el tiempo necesario para completar una solicitud.Es una de las métricas más importantes desde la perspectiva del usuario final, ya que está directamente relacionada con la experiencia de uso.

Por ejemplo:

95 % de las solicitudes completadas en menos de 300 ms

Su utilidad principal es detectar:

* Consultas lentas a la base de datos.
* Cuellos de botella en la aplicación.
* Saturación de CPU o memoria.
* Problemas de red.
* Servicios externos con alta latencia.

### ¿Qué es OTLP?

OpenTelemetry es un estándar abierto para generar información de observabilidad dentro de una aplicación. En nuestro caso, se utiliza para instrumentar la API de AlentApp y obtener métricas sobre su comportamiento en tiempo de ejecución.

La API genera métricas como cantidad de requests, errores HTTP y duración de las solicitudes. Estas métricas se crean mediante el SDK de OpenTelemetry y se exponen directamente en un endpoint compatible con Prometheus.

La API usa PrometheusExporter, que publica las métricas en el endpoint:

```bash
:9464/metrics
```
Luego, Prometheus consulta periódicamente ese endpoint mediante scraping y almacena las series temporales. Finalmente, Grafana se conecta a Prometheus como fuente de datos para visualizar la información en dashboards.

Arquitectura utilizada:

Aplicación → OpenTelemetry SDK + PrometheusExporter → Prometheus → Grafana

### Relación entre OpenTelemetry, Prometheus y Grafana

OpenTelemetry genera las métricas dentro de la API, Prometheus las recolecta y almacena, y Grafana las visualiza.

El flujo implementado es:

1. La API genera métricas mediante OpenTelemetry SDK.
2. PrometheusExporter expone las métricas en `:9464/metrics`.
3. Prometheus recolecta esas métricas mediante scraping.
4. Prometheus almacena las series temporales.
5. Grafana consulta Prometheus como datasource.
6. Grafana presenta la información mediante dashboards.

Grafana permite visualizar información como:

- Requests por segundo.
- Tiempo de respuesta de la API.
- Cantidad de errores HTTP.
- Latencia p95/p99.
- Uso de memoria del proceso Node.js.
- Distribución de respuestas por código HTTP.
- Endpoints con mayor latencia.

Esto permite monitorear el estado del sistema en tiempo real, detectar problemas de rendimiento o errores frecuentes y tomar decisiones basadas en métricas objetivas
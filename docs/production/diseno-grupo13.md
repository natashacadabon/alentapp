# Diseño de la infraestructura Docker
El objetivo de esta fase es diseñar una infraestructura Docker orientada a entornos productivos para la aplicación AlentApp. El diseño propuesto busca mejorar la seguridad, reducir el tamaño de las imágenes, aumentar la observabilidad del sistema y garantizar despliegues reproducibles.

La solución estará compuesta por tres archivos principales: 

* `packages/api/Dockerfile.prod`
* `packages/web/Dockerfile.prod`
* `docker-compose.prod.yml`

## packages/api/Dockerfile.prod

### Proposito
 Este Dockerfile,  `packages/api/Dockerfile.prod`,  tiene como objetivo construir una imagen optimizada para ejecutar la API en producción. A diferencia de un Dockerfile de desarrollo, no debe incluir herramientas innecesarias como hot reload, dependencias de desarrollo, archivo fuente no utilizados mi configuraciones pensadas únicamente para programar localmente. 
Debe contener solamente lo necesario para ejecutar el backend ya compilado: 
* Código JavaScript compilado. 
* Dependencias necesarias para producción. 
* Configuración mínima para ejecución.

La utilización de una imagen reducida disminuye tiempos de despliegue, reduce la superficie de ataque y mejora la mantenibilidad del sistema. 
### Estructura

| Etapa | Nombre | Base | Propósito |
|--------|--------|--------|--------|
| Stage 1 | `deps` | `node:22-alpine` | Instalar únicamente las dependencias de producción utilizando `npm ci --omit=dev`. Esta etapa permite aislar las dependencias necesarias para el entorno de ejecución y evita que paquetes de desarrollo lleguen a la imagen final. |
| Stage 2 | `build` | `node:22-alpine` | Instalar las dependencias necesarias para compilar el proyecto, ejecutar la compilación de TypeScript y generar los archivos JavaScript que serán utilizados en producción. Esta etapa puede incluir herramientas de desarrollo porque no formará parte de la imagen final. |
| Stage 3 | `runtime` | `node:22-alpine` | Ejecutar la API en producción utilizando únicamente el código compilado, las dependencias de producción y un usuario sin privilegios (no-root). Es la única etapa que se distribuye y despliega en el entorno productivo. |

### Secciones principales del Dockerfile 
El Dockerfile debe organizarse en tres bloques bien diferenciados. 
Primero, la etapa `deps`instala las dependencias productivas. Para garantizar instalaciones reproducibles se debe utilizar `npm ci`, porque respeta estrictamente el archivo `package-lock.json`. Al usar  `--omit=dev`, se excluyen dependencias como herramientas de testing, compiladores, linters o utilidades de desarrollo. 

Luego, la etapa build se encarga de preparar el artefacto ejecutable. En esta etapa sí se instalan todas las dependencias, incluyendo las de desarrollo, porque son necesarias para compilar TypeScript. Como resultado, se genera una carpeta de salida, por ejemplo dist, que contiene el código JavaScript listo para ejecutarse.

Finalmente, la etapa runtime copia solamente los elementos necesarios desde las etapas anteriores: los node_modules productivos y el código compilado. Esta etapa debe definir variables de entorno de producción, exponer el puerto correspondiente, configurar un usuario sin privilegios y ejecutar el servidor con node.
### Requisitos técnicos
El diseño debe cumplir con los siguientes requisitos:
* Usar un usario no-root, por ejemplo `appuser`.
* Ejecutar la API en modo producción, no con `tsx watch` ni herramientas de desarrollo. 
* Incluir un `HEALTHCHECK` contra `localhost:3000` o contra el endpoint de salud definido por la API. 
* Utilizar .dockerignore para excluir archivos innecesarios como node_modules, .git, dist, logs y archivos temporales.
* Evitar copiar secretos o archivos .env dentro de la imagen.
* Copiar primero package.json y package-lock.json antes que el resto del código para aprovechar mejor la caché de capas.
* Exponer únicamente el puerto necesario para la API.
### Requisitos no funcionales: 
|Requisito|Valor esperado|Justificación|
|------|------|------|
Tamaño máximo de imagen| Menor a 250 MB| Una imagen liviana reduce tiempos de descarga, despliegue y consumo de almacenamiento. 
Tiempo de startup|  Menor a 10 segundos | La API debe iniciar rápidamente ante reinicios o nuevos despliegues. 
Usuario de ejecución | No-root| Reduce el impacto ante una posible vulnerabilidad dentro del contenedor. 
Dependencias en runtime | Solo producción| Disminuye tamaño, superficie de ataque y posibles vulnerabilidades.|
Reproducible| Uso de `npm ci`| Garantiza que las mismas versiones se instalen en cada build. 
Disponibilidad | Healthcheck activo | Permite detectar si el proceso está vivo pero la API no responde correctamente. 
Seguridad | Sin .env ni secretos en imagen | Evita exponeer credenciales dentro del artefacto Docker.

## packages/web/Dockerfile.prod

### Propósito 
Este Dockerfile, `packages/web/Dockerfile.prod`, tiene como objetivo construir una imagen optimizada para ejecutar el frontend de la aplicación en un entorno productivo. A diferencia del entorno de desarrollo, donde se utiliza Vite con hot reload mediante `npm run dev`, en producción no se debe ejecutar el servidor de desarrollo ni incluir dependencias innecesarias. 
El frontend debe compilarse previamente para generar archivos estáticos HTML, CSS y JavaScript. Luego, esos archivos deben ser servidos por un servidor web liviano y eficiente, como Nginx.

La imagen final debe contener: 
* Archivos estáticos generados por Vite.
* Configuración mínima de Nginx.
* Healthcheck HTTP.
* Usuario sin privilegios cuando sea posible.

Este diseño permite reducir el tamaño de la imagen, mejorar el tiempo de inicio, aumentar la seguridad y entregar la aplicación web de forma más eficiente.
### Estructura
|Etapa|Nombre|Base|Propósito|
|--------|------|------|------|
Stage 1| `build` | `node:22-alpine`| Instalar dependencias, compilar la aplicación React/Vite y generar la carpeta `dist` con los archivos estáticos finales. Esta etapa puede incluir herramientas de desarrollo porque no formará parte de la imagen final.|
Stage 2 | `runtime` | `nginx:alpine` |Servir los archivos estáticos generados en la etapa anterior utilizando Nginx. Es la única etapa que se despliega en producción y no necesita incluir Node.js ni dependencias de desarrollo.

### Secciones principales del Dockerfile

El Dockerfile del frontend debe organizarse en dos etapas principales.

Primero, la etapa `build` se encarga de instalar las dependencias del proyecto y ejecutar el proceso de compilación de Vite. Para garantizar instalaciones reproducibles, se debe utilizar `npm ci`, ya que respeta estrictamente las versiones definidas en el archivo `package-lock.json`. En esta etapa se genera la carpeta `dist`, que contiene la versión optimizada de la aplicación React lista para producción.

Luego, la etapa `runtime`  utiliza una imagen base liviana de Nginx. En esta etapa se copian únicamente los archivos estáticos generados en `dist` hacia el directorio desde el cual Nginx sirve contenido web. Esto evita incluir Node.js, TypeScript, Vite, dependencias de desarrollo o código fuente innecesario en la imagen final.

Además, esta etapa debe incluir una configuración mínima de Nginx para servir correctamente una aplicación SPA. Esto es importante porque React maneja rutas del lado del cliente, por lo que Nginx debe redirigir las rutas internas hacia `index.html`.

### Requisitos técnicos

El diseño debe cumplir con los siguientes requisitos:

* Compilar la aplicación React/Vite antes de construir la imagen final.
* No ejecutar `npm run dev` en producción.
* No incluir Node.js en la imagen final.
* Servir los archivos estáticos mediante Nginx.
* Copiar únicamente la carpeta `dist` a la imagen final.
* Incluir un `HEALTHCHECK` HTTP contra `localhost`.
* Utilizar ` .dockerignore` para excluir archivos innecesarios como `node_modules`, `.git`, logs, archivos temporales y builds previos.
* Evitar copiar archivos `.env` o secretos dentro de la imagen.
* Exponer únicamente el puerto necesario para el frontend, por ejemplo `80`.
### Requisitios no funcionales
|Requisito| Valor esperado | Justificación|
|--------|---------|----------|
Tamaño máximo de imagen |Menor a 100 MB| Al usar `nginx:alpine` y copiar únicamente archivos estáticos, la imagen final queda considerablemente más liviana.|
Tiempo de startup|Menor a 5 segundos|Nginx inicia muy rápido porque sólo debe servir archivos estáticos ya compilados.
Seguridad|Sin Node.js en runtime|Reduce la superficie de ataque porque no se incluyen herramientas de build ni dependencias del ecosistema Node en producción.
Rendimiento|Servir archivos estáticos optimizados|Vite genera archivos minificados y preparados para producción.
Disponibilidad|Healthcheck HTTP activo|Permite detectar si el servidor web está corriendo y respondiendo correctamente.
Reproducibilidad|Uso de `npm ci`|	Garantiza que las mismas versiones de dependencias se instalen en cada build.
Mantenibilidad|	Separación entre build y runtime|	Facilita distinguir claramente entre la etapa de compilación y la etapa de ejecución.
## docker-compose.prod.yml
### Proposito
El archivo `docker-compose.prod.yml` tiene como objetivo definir y orquestar todos los servicios necesarios para ejecutar la aplicación AlentApp en un entorno productivo o pre-productivo. A diferencia de un archivo `docker-compose.yml` orientado al desarrollo local, esta configuración debe evitar herramientas de desarrollo, volúmenes de código fuente, credenciales hardcodeadas y comandos como `npm run dev` o `tsx watch`.

Su función principal es coordinar la ejecución de los servicios que componen el sistema, estableciendo cómo se construyen o consumen las imágenes, cómo se comunican entre sí, qué variables de entorno necesitan, qué puertos se exponen, qué volúmenes se utilizan para persistencia y qué políticas de disponibilidad se aplican.

Este archivo debe permitir levantar una infraestructura más cercana a producción, incorporando:
* Base de datos PostgreSQL.
* API backend Node.js/TypeScript.
* Frontend React/Vite servido con Nginx.
* OpenTelemetry Collector.
* Prometheus.
* Grafana.
* Volúmenes persistentes.
* Healthchecks.
* Políticas de reinicio.
* Redes internas separadas.

La finalidad es lograr una arquitectura más segura, observable, mantenible y reproducible.
### Estructura
|Sección|Elemento|Propósito|
|-------|--------|---------|
|`services`|	Define los contenedores principales|Agrupa todos los servicios que forman parte de la aplicación y de la infraestructura de observabilidad.
|`db`|PostgreSQL 16|Almacenar de forma persistente la información del sistema.
|`api`|Backend Node.js/TypeScript|Exponer la API REST, aplicar reglas de negocio y comunicarse con la base de datos.
|`web`|Frontend Nginx|Servir la aplicación React compilada como archivos estáticos.
|`otel-collector`|	OpenTelemetry Collector|	Recibir métricas, logs y trazas desde la API y exportarlas hacia herramientas de monitoreo.
`prometheus`|	Prometheus|	Almacenar métricas temporales y permitir consultas sobre el estado del sistema.
|`grafana`|	Grafana|	Visualizar métricas mediante dashboards.
|`volumes`|	Volúmenes| persistentes	Conservar datos de PostgreSQL y configuraciones/datos de Grafana aunque los contenedores se reinicien.
|`networks`|	Redes Docker internas|	Aislar la comunicación entre servicios y evitar exposición innecesaria.
### Servicios principales
#### Servicio `db`
El servicio `db` representa la base de datos PostgreSQL 16. Su responsabilidad es almacenar la información persistente de la aplicación. En producción no se recomienda exponer PostgreSQL públicamente hacia el exterior, sino permitir que únicamente la API pueda comunicarse con la base de datos mediante la red interna de Docker.

Debe utilizar un volumen persistente para evitar pérdida de datos ante reinicios o recreación del contenedor. Las credenciales deben obtenerse desde variables de entorno externas o secretos, evitando valores hardcodeados en el archivo.

Responsabilidades principales:

* Persistir datos de la aplicación.
* Permitir conexiones internas desde la API.
* Mantener datos aunque el contenedor sea recreado.
* Utilizar credenciales externas.
* Incluir healthcheck para verificar disponibilidad.
#### Servicio `api`

El servicio `api` representa el backend de la aplicación. Debe ejecutarse utilizando la imagen generada a partir de `packages/api/Dockerfile`.prod. A diferencia del entorno de desarrollo, no debe montar el código fuente con `.:/app` ni ejecutar herramientas de hot reload.

La API debe iniciarse en modo producción, conectarse a PostgreSQL mediante variables de entorno y exponer únicamente el puerto necesario para recibir solicitudes desde el frontend o desde un reverse proxy.

Responsabilidades principales:

* Exponer endpoints REST.
* Ejecutar reglas de negocio.
* Conectarse a PostgreSQL.
* Exportar telemetría mediante OpenTelemetry.
* Incluir healthcheck.
* Reiniciarse automáticamente ante fallos.

#### Servicio `web`

El servicio `web` representa el frontend de la aplicación. Debe ejecutarse utilizando la imagen generada a partir de `packages/web/Dockerfile.prod`, donde la aplicación React/Vite ya fue compilada y servida mediante Nginx.

En producción no debe ejecutarse `npm run dev`, ya que ese comando corresponde al servidor de desarrollo de Vite. El contenedor final debe servir únicamente archivos estáticos optimizados.

Responsabilidades principales:

* Servir la aplicación React compilada.
* Responder solicitudes HTTP.
* Redirigir rutas SPA hacia `index.html`.
* Incluir healthcheck HTTP.
* Exponer el puerto HTTP necesario.

#### Servicio `otel-collector`

El servicio `otel-collector` se encarga de recibir datos de telemetría generados por la aplicación. Estos datos pueden incluir métricas, logs y trazas. El collector actúa como intermediario entre la aplicación y las herramientas de observabilidad.

Su uso permite desacoplar la aplicación del backend de monitoreo. La API no necesita conocer directamente a Prometheus o Grafana; simplemente exporta telemetría mediante OTLP hacia el collector.

Responsabilidades principales:

* Recibir telemetría OTLP desde la API.
* Procesar métricas, logs y trazas.
* Exportar métricas hacia Prometheus.
* Centralizar la configuración de observabilidad.

#### Servicio `prometheus`

Prometheus se utiliza para almacenar métricas temporales y permitir consultas sobre el estado del sistema. Puede obtener métricas desde el OpenTelemetry Collector y almacenarlas para su posterior visualización.

Responsabilidades principales:

* Almacenar métricas.
* Permitir consultas mediante PromQL.
* Servir como fuente de datos para Grafana.
* Facilitar alertas sobre el estado de los servicios.

#### Servicio `grafana`

Grafana se utiliza como herramienta de visualización. Permite construir dashboards para monitorear el comportamiento del sistema y analizar métricas relevantes como cantidad de solicitudes, errores, duración de respuestas, uso de CPU y memoria, entre otras.

Responsabilidades principales:

* Visualizar métricas.
* Crear dashboards.
* Conectarse a Prometheus como datasource.
* Facilitar el monitoreo operativo del sistema.

### Requisitos técnicos

El diseño debe cumplir con los siguientes requisitos:

* Usar imágenes productivas generadas por `Dockerfile.prod`.
* No montar el código fuente con `.:/app`.
* No ejecutar comandos de desarrollo como `npm run dev` o `tsx watch`.
* Utilizar variables de entorno externas para credenciales y configuraciones sensibles.
* Definir healthchecks para servicios críticos.
* Configurar políticas de reinicio como restart: unless-stopped.
* Utilizar volúmenes persistentes para PostgreSQL y Grafana.
* Separar servicios mediante redes internas.
* Evitar exponer puertos innecesarios.
* Permitir la comunicación interna entre `api`, `db` y servicios de observabilidad.
* Incluir OpenTelemetry Collector, Prometheus y Grafana para observabilidad.
* Definir límites de recursos cuando sea posible
### Requisitos no funcionales
Requisito|Valor esperado|	Justificación|
|----------|------------|------|
Disponibilidad|Reinicio automático de servicios críticos|Permite recuperar servicios ante caídas inesperadas sin intervención manual.
Seguridad|Sin credenciales hardcodeadas|	Evita exponer usuarios, contraseñas o tokens dentro del repositorio.
Aislamiento|	Redes internas separadas|	Reduce exposición innecesaria y limita la comunicación sólo a los servicios que la necesitan.
Persistencia|	Volúmenes para PostgreSQL y Grafana	|Evita pérdida de datos ante reinicios o recreación de contenedores.
Observabilidad|	OpenTelemetry, Prometheus y Grafana	|Permite monitorear métricas, errores, latencia y estado general del sistema.
Reproducibilidad|	Imágenes productivas versionadas|	Garantiza que el mismo artefacto pueda ejecutarse de forma consistente.|
Performance	|Sin hot reload ni herramientas dev|	Reduce consumo de CPU y memoria en producción.
Mantenibilidad|	Separación clara de servicios	|Facilita diagnosticar errores, actualizar componentes y escalar partes del sistema.
Startup	|Menor a 30 segundos para servicios principales	|El sistema debe recuperarse rápidamente ante reinicios.
Gestión de recursos|	Límites de CPU y memoria|	Evita que un contenedor consuma todos los recursos del host.

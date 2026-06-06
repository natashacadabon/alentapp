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


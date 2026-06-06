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

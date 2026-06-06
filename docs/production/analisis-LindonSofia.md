# Actividad Docker y OpenTelemetry

## 1.1. Analizar la infraestructura Docker actual

Se analizó la configuración Docker existente del proyecto a partir de los siguientes archivos:

- `docker-compose.yml`: configuración actual de servicios.
- `packages/api/Dockerfile`: Dockerfile actual de la API.
- `packages/web/Dockerfile`: Dockerfile actual del frontend.

---

## Problemas o vulnerabilidades detectadas

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|---|---|---|
| Uso de credenciales hardcodeadas | `docker-compose.yml`, servicio `db`, variables `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. También en `DATABASE_URL` del servicio `api`. | Alto | Mover las credenciales a un archivo `.env` y referenciarlas desde el `docker-compose.yml`. No deberían quedar usuario, contraseña ni URL de base de datos escritos directamente en el archivo. |
| Los contenedores corren en modo desarrollo | `packages/api/Dockerfile`, línea del `CMD`: `npm run dev -w packages/api`. También en `packages/web/Dockerfile`, línea del `CMD`: `npm run dev -w packages/web`. Además, en `docker-compose.yml` se usa `tsx watch` y `npm run dev`. | Alto | Separar configuración de desarrollo y producción. Para producción se debería usar `npm run build` y luego ejecutar el código compilado, por ejemplo con `node dist/app.js`, en lugar de usar watchers o servidores de desarrollo. |
| No hay límites de CPU ni memoria | `docker-compose.yml`, servicios `db`, `api` y `web`. | Medio | Agregar límites de recursos para evitar que un contenedor consuma toda la memoria o CPU disponible. |
| No hay healthcheck para API ni frontend | `docker-compose.yml`. Solo el servicio `db` tiene `healthcheck`. | Medio | Agregar `healthcheck` para `api` y `web`, verificando que respondan correctamente en sus puertos. |
| Se copia todo el código fuente dentro de la imagen | `packages/api/Dockerfile`, línea `COPY . .`. También en `packages/web/Dockerfile`, línea `COPY . .`. | Medio | Usar un `.dockerignore` para evitar copiar archivos innecesarios como `node_modules`, `.git`, logs, archivos temporales o documentación. |
| Las imágenes no están optimizadas para producción | `packages/api/Dockerfile` y `packages/web/Dockerfile` usan una sola etapa y ejecutan `npm install`. | Medio | Usar multi-stage builds: una etapa para instalar dependencias y compilar, y otra etapa más liviana para ejecutar la aplicación. También se puede usar `npm ci` en lugar de `npm install`. |
| Los puertos de base de datos están expuestos al host | `docker-compose.yml`, servicio `db`, sección `ports: '5432:5432'`. | Medio | En producción, la base de datos no debería exponerse públicamente si solo la usa la API. Se puede reemplazar `ports` por `expose` o dejarla accesible solo dentro de la red interna de Docker. |
| No se define usuario no root | `packages/api/Dockerfile` y `packages/web/Dockerfile`. | Alto | Crear y usar un usuario no privilegiado dentro del contenedor, por ejemplo `USER node`. Esto reduce el impacto si un atacante logra ejecutar código dentro del contenedor. |
| Uso de volúmenes que montan todo el proyecto | `docker-compose.yml`, servicios `api` y `web`, línea `- .:/app`. | Medio | Esto es útil en desarrollo, pero no es recomendable en producción. Para producción, la imagen debería contener el código ya compilado y no depender de montar todo el proyecto local dentro del contenedor. |
| La API ejecuta migraciones automáticamente al iniciar | `docker-compose.yml`, servicio `api`, comando `npx prisma migrate dev --name init`. | Alto | En producción no debería usarse `migrate dev`, porque está pensado para desarrollo. Se recomienda usar `prisma migrate deploy` para aplicar migraciones ya creadas de forma controlada. |

---

## Desarrollo detallado de los problemas principales

### 1. Credenciales hardcodeadas

En el archivo `docker-compose.yml` se observa que el servicio `db` tiene valores sensibles escritos directamente:

```yml
POSTGRES_USER: admin
POSTGRES_PASSWORD: password123
POSTGRES_DB: alentapp_db
```

También la API usa directamente:

```yml
DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db
```
Esto representa un problema de seguridad porque las credenciales quedan visibles para cualquier persona que tenga acceso al repositorio. En un entorno real, si el proyecto se sube a GitHub, esas credenciales podrían quedar expuestas.

La solución sería mover esos valores a un archivo .env:

``` yml
POSTGRES_USER=admin
POSTGRES_PASSWORD=password123
POSTGRES_DB=alentapp_db
DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db
```
Y luego referenciarlos desde el `docker-compose.yml`:

```yml
environment:
POSTGRES_USER: ${POSTGRES_USER
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
POSTGRES_DB: ${POSTGRES_DB}
```
De esta forma, las credenciales quedan separadas del archivo principal de configuración y se evita dejarlas escritas directamente en el repositorio.

### 2. Los contenedores corren en modo desarrollo

Tanto la API como el frontend se ejecutan con comandos pensados para desarrollo.

En la API, dentro del `docker-compose.yml`, se utiliza:

```yml
npx tsx watch packages/api/src/app.ts
```
Y en el frontend:
```yml
npm run dev -w packages/web -- --host 0.0.0.0
```

Esto no es recomendable para producción porque los watchers consumen más recursos, están pensados para recargar cambios automáticamente y no representan una ejecución estable u optimizada.

Además, en los Dockerfile actuales también se observa el uso de comandos de desarrollo:

```yml
CMD ["npm", "run", "dev", "-w", "packages/api"]
```
```yml
CMD ["npm", "run", "dev", "-w", "packages/web", "--", "--host", "0.0.0.0"]
```

La solucion seria separar el entorno de desarrollo del entorno de producción.

Para la API, en produccion podria utilizarse 
```yml
RUN npm run build -w packages/api
CMD ["node", "packages/api/dist/app.js"]
```

Para el frontend, en producción no se debería usar directamente el servidor de desarrollo de Vite. Lo recomendable sería compilar el frontend y servir los archivos estáticos con un servidor como Nginx.

### 3. Falta de límites de CPU y memoria

En el archivo `docker-compose.yml` no se definen límites de CPU ni memoria para los servicios:

- `db`
- `api`
- `web`

Esto puede ser un problema porque, si un servicio empieza a consumir demasiados recursos por un error, una carga inesperada o una mala consulta, puede afectar a todo el entorno.

Por ejemplo, si la API entra en un proceso muy costoso o si la base de datos recibe muchas consultas pesadas, podría consumir demasiada memoria o CPU del host. Esto podría provocar lentitud, caídas o afectar a otros contenedores.

Una posible mejora sería agregar límites como:

```yml
deploy:
  resources:
    limits:
      cpus: '0.50'
      memory: 512M
```

Ejemplo aplicado al servicio `api`:

```yml
api:
  build:
    context: .
    dockerfile: packages/api/Dockerfile
  container_name: alentapp-api
  deploy:
    resources:
      limits:
        cpus: '0.50'
        memory: 512M
```

Aunque en Docker Compose clásico algunas opciones de `deploy` aplican principalmente a Docker Swarm, la idea importante es que en producción deberían existir restricciones de recursos.

También podrían definirse límites específicos para cada servicio según su necesidad:

```yml
db:
  deploy:
    resources:
      limits:
        cpus: '1.00'
        memory: 1G

api:
  deploy:
    resources:
      limits:
        cpus: '0.50'
        memory: 512M

web:
  deploy:
    resources:
      limits:
        cpus: '0.25'
        memory: 256M
```

De esta forma, se evita que un contenedor pueda consumir todos los recursos disponibles de la máquina.

---

### 4. Falta de healthchecks para API y frontend

El servicio `db` sí tiene un `healthcheck` definido:

```yml
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U admin -d alentapp_db']
  interval: 5s
  timeout: 5s
  retries: 5
```

Esto permite verificar que PostgreSQL esté listo antes de que la API intente conectarse.

Sin embargo, los servicios `api` y `web` no tienen healthcheck.

Esto significa que Docker puede considerar que el contenedor está levantado aunque la aplicación todavía no esté respondiendo correctamente.

Por ejemplo, el contenedor de la API puede estar iniciado, pero la aplicación Fastify podría haber fallado internamente o todavía no estar lista para recibir peticiones.

Una posible solución para la API sería agregar una ruta simple de estado:

```ts
server.get('/health', async () => {
  return { status: 'ok' };
});
```

Luego, en el `docker-compose.yml`, se podría agregar un `healthcheck` para la API:

```yml
api:
  healthcheck:
    test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
    interval: 10s
    timeout: 5s
    retries: 5
```

Esto permitiría verificar que la API no solo esté iniciada, sino que también esté respondiendo correctamente.

Para el frontend también se podría agregar una verificación similar:

```yml
web:
  healthcheck:
    test: ["CMD", "wget", "--spider", "-q", "http://localhost:5173"]
    interval: 10s
    timeout: 5s
    retries: 5
```

Esto ayuda a detectar servicios caídos o que no están listos para recibir tráfico.

---

### 5. Se copia todo el código fuente dentro de la imagen

En los Dockerfile de la API y del frontend aparece la instrucción:

```Dockerfile
COPY . .
```

Esto copia todo el contenido del proyecto dentro de la imagen Docker.

El problema es que, si no existe un archivo `.dockerignore`, también pueden copiarse archivos innecesarios como:

- `node_modules`
- `.git`
- archivos temporales
- logs
- documentación
- archivos de configuración local
- archivos `.env`

Esto aumenta el tamaño de la imagen y puede exponer información que no debería estar dentro del contenedor.

Además, copiar archivos innecesarios puede hacer que el proceso de build sea más lento y menos eficiente.

Una solución sería crear un archivo `.dockerignore` en la raíz del proyecto:

```dockerignore
node_modules
.git
.gitignore
.env
*.log
dist
coverage
.DS_Store
```

De esta forma, Docker ignora esos archivos al momento de construir la imagen.

Esto mejora el tamaño de la imagen, reduce tiempos de build y evita incluir información sensible o innecesaria.

---

### 6. Imágenes no optimizadas para producción

Los Dockerfile actuales usan una sola etapa y ejecutan:

```Dockerfile
RUN npm install
```

Esto puede generar imágenes más pesadas y menos reproducibles.

Una mejor práctica para producción es usar:

```Dockerfile
RUN npm ci
```

`npm ci` instala exactamente las dependencias definidas en el `package-lock.json`, por lo que es más recomendable para entornos controlados como CI/CD o producción.

También se recomienda usar multi-stage builds.

Un build multi-stage permite separar la etapa de construcción de la etapa final de ejecución.

Ejemplo conceptual para la API:

```Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

RUN npm ci

COPY . .

RUN npm run build -w packages/api

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/node_modules ./node_modules

CMD ["node", "packages/api/dist/app.js"]
```

Esto permite que la imagen final tenga solo lo necesario para ejecutar la aplicación.

En producción no debería ejecutarse el código con `npm run dev`, sino con el código ya compilado.

---

### 7. Puerto de base de datos expuesto al host

En el servicio `db` del `docker-compose.yml` aparece:

```yml
ports:
  - '5432:5432'
```

Esto expone PostgreSQL al host.

En desarrollo puede ser útil para conectarse con herramientas externas, como DBeaver, PgAdmin o extensiones de base de datos.

Sin embargo, en producción no es recomendable exponer directamente la base de datos si solo la API necesita acceder a ella.

El riesgo es que la base de datos quede accesible desde fuera del entorno Docker, aumentando la superficie de ataque.

Una alternativa sería quitar `ports` y dejar que la API se comunique con la base de datos mediante la red interna de Docker:

```yml
db:
  image: postgres:16-alpine
  expose:
    - "5432"
```

Incluso se podría omitir `expose`, porque los servicios dentro del mismo `docker-compose.yml` pueden comunicarse usando el nombre del servicio.

En este caso, la API puede conectarse a PostgreSQL usando el host:

```txt
db
```

Como ya aparece en la variable:

```yml
DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db
```

Esto significa que no hace falta publicar el puerto de PostgreSQL hacia la máquina host para que la API funcione.

---

### 8. No se define usuario no root

En los Dockerfile actuales no aparece ninguna instrucción `USER`.

Eso significa que el proceso puede ejecutarse como root dentro del contenedor.

Esto es una mala práctica de seguridad porque, si alguien logra explotar una vulnerabilidad dentro de la aplicación, tendría más privilegios dentro del contenedor.

Una posible solución sería usar el usuario `node`, disponible en las imágenes oficiales de Node:

```Dockerfile
USER node
```

También puede ser necesario ajustar permisos antes de cambiar de usuario:

```Dockerfile
RUN chown -R node:node /app
USER node
```

De esta forma, la aplicación se ejecuta con un usuario menos privilegiado.

Esto reduce el impacto de una posible vulnerabilidad dentro del contenedor.

---

### 9. Uso de volúmenes montando todo el proyecto

En el servicio `api` se monta todo el proyecto:

```yml
volumes:
  - .:/app
```

Y en el servicio `web` también:

```yml
volumes:
  - .:/app
```

Esto es útil para desarrollo porque permite que los cambios locales se reflejen automáticamente dentro del contenedor.

Sin embargo, en producción no es recomendable.

En producción, el contenedor debería usar el código ya incluido en la imagen. No debería depender de archivos montados desde la máquina host.

Además, montar todo el proyecto puede generar problemas de seguridad, diferencias entre entornos y conflictos con dependencias.

La solución sería tener una configuración separada para desarrollo y otra para producción.

Por ejemplo:

```txt
docker-compose.yml
docker-compose.prod.yml
```

En el archivo de producción se deberían eliminar los volúmenes de código fuente.

Ejemplo para producción:

```yml
api:
  build:
    context: .
    dockerfile: packages/api/Dockerfile
  container_name: alentapp-api
  environment:
    - DATABASE_URL=${DATABASE_URL}
  ports:
    - '3000:3000'
```

En este caso, ya no se monta:

```yml
- .:/app
```

porque el código debería estar dentro de la imagen Docker.

---

### 10. Uso de `prisma migrate dev` al iniciar la API

En el servicio `api`, el comando actual ejecuta:

```yml
npx prisma migrate dev --name init --config packages/api/prisma.config.ts
```

Esto es un problema porque `migrate dev` está pensado para entornos de desarrollo.

En producción se recomienda usar:

```bash
npx prisma migrate deploy --config packages/api/prisma.config.ts
```

La diferencia es que `migrate deploy` aplica migraciones ya existentes de forma más segura y controlada.

En cambio, `migrate dev` puede crear o modificar migraciones durante el desarrollo.

Una versión más adecuada para producción sería:

```yml
command: >
  sh -c "npx prisma migrate deploy --config packages/api/prisma.config.ts &&
         npx prisma generate --config packages/api/prisma.config.ts &&
         node packages/api/dist/app.js"
```

Esto permite aplicar migraciones ya creadas y luego iniciar la API usando el código compilado.

---

## 1.2. Investigar OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry es un conjunto de herramientas, APIs y SDKs que permite instrumentar aplicaciones para recolectar datos de observabilidad.

Su objetivo es generar, recolectar y exportar información sobre el comportamiento interno de un sistema.

OpenTelemetry permite trabajar con diferentes señales de observabilidad, como:

- métricas,
- logs,
- trazas.

OpenTelemetry no es una base de datos ni una herramienta de visualización. Su función principal es instrumentar la aplicación y enviar datos hacia otras herramientas.

Prometheus, en cambio, está más enfocado en recolectar, almacenar y consultar métricas. Funciona muy bien para monitoreo basado en métricas, alertas y series temporales.

La diferencia principal es:

- OpenTelemetry sirve para instrumentar aplicaciones y recolectar distintos tipos de señales.
- Prometheus se especializa principalmente en métricas.
- OpenTelemetry puede exportar métricas hacia Prometheus, pero también puede trabajar con trazas y logs.

---

### ¿Cuáles son los “3 pilares” de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares clásicos de la observabilidad son:

1. Métricas.
2. Logs.
3. Trazas.

OpenTelemetry aborda los tres pilares.

Esto significa que puede utilizarse para recolectar información sobre:

- qué está pasando en el sistema,
- cuántas solicitudes se procesan,
- cuánto tardan,
- qué errores ocurren,
- cómo viaja una petición entre servicios,
- qué eventos relevantes quedan registrados.

Aunque OpenTelemetry comenzó siendo muy fuerte en trazas y métricas, actualmente también contempla logs.

---

### Métricas RED

Las métricas RED son un conjunto de métricas muy utilizadas para observar servicios, APIs o endpoints.

RED significa:

- Rate
- Errors
- Duration

---

#### Rate

Rate indica la cantidad de solicitudes que recibe un servicio en un período de tiempo.

Por ejemplo:

```txt
requests por segundo
cantidad de llamadas a un endpoint
cantidad de peticiones HTTP por minuto
```

Sirve para saber cuánta carga está recibiendo la aplicación.

Ejemplo aplicado a la API:

```txt
¿Cuántas veces se llamó al endpoint GET /api/v1/medicalcertificate?
```

---

#### Errors

Errors mide cuántas solicitudes fallan.

Por ejemplo:

```txt
cantidad de respuestas 500
cantidad de respuestas 400
cantidad de errores por endpoint
```

Sirve para detectar problemas funcionales o fallos del sistema.

Ejemplo aplicado a la API:

```txt
¿Cuántas solicitudes al endpoint POST /api/v1/medicalcertificate fallaron?
```

Esto podría ayudar a detectar errores en la creación de certificados médicos.

---

#### Duration

Duration mide cuánto tarda el servicio en responder.

Por ejemplo:

```txt
tiempo promedio de respuesta
latencia de un endpoint
percentil 95 de duración
```

Sirve para detectar lentitud, cuellos de botella o degradación del rendimiento.

Ejemplo aplicado a la API:

```txt
¿Cuánto tarda en responder el endpoint GET /api/v1/medicalcertificate?
```

Si el tiempo de respuesta aumenta demasiado, podría indicar problemas en la base de datos, consultas lentas o sobrecarga del servidor.

---

### ¿Qué es OTLP?

OTLP significa OpenTelemetry Protocol.

Es el protocolo que usa OpenTelemetry para enviar datos de observabilidad, como métricas, logs y trazas, desde una aplicación o agente hacia un collector o backend.

En lugar de que cada herramienta tenga su propio formato, OTLP permite usar un formato estándar para transportar datos de observabilidad.

Esto facilita que una aplicación pueda enviar datos a distintas herramientas sin depender de una sola tecnología.

---

### ¿Qué ventaja tiene OTLP frente a exportar directamente a Prometheus?

La ventaja principal de OTLP es la flexibilidad.

Si una aplicación exporta directamente a Prometheus, queda más atada a ese backend de métricas.

En cambio, si exporta usando OTLP, puede enviar los datos a un OpenTelemetry Collector y desde ahí decidir a dónde reenviarlos.

Por ejemplo, el collector podría enviar:

- métricas a Prometheus,
- trazas a Jaeger o Tempo,
- logs a Loki,
- datos completos a Grafana Cloud u otra plataforma.

Esto permite cambiar herramientas sin modificar tanto el código de la aplicación.

También permite centralizar la recolección de datos de observabilidad en un solo componente.

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

Grafana se usa para visualizar datos de observabilidad mediante dashboards.

OpenTelemetry puede recolectar datos de una aplicación y enviarlos a distintos backends compatibles con Grafana.

Por ejemplo:

- métricas a Prometheus,
- logs a Loki,
- trazas a Tempo.

Luego Grafana permite visualizar esos datos en paneles, gráficos y dashboards.

Entonces, OpenTelemetry se encarga de recolectar y exportar los datos, mientras que Grafana se encarga de mostrarlos de forma visual y útil para analizar el sistema.

---

## Conclusión

La infraestructura Docker actual está orientada principalmente a desarrollo.

Esto se observa en:

- el uso de `npm run dev`,
- el uso de `tsx watch`,
- los volúmenes montados sobre todo el proyecto,
- las credenciales hardcodeadas,
- la ausencia de límites de recursos,
- la falta de healthchecks en API y frontend,
- el uso de migraciones de desarrollo al iniciar la API.

Para acercar la configuración a buenas prácticas de producción, sería necesario:

- separar entornos de desarrollo y producción,
- proteger las credenciales usando variables de entorno,
- optimizar las imágenes Docker,
- usar builds multi-stage,
- definir usuarios no root,
- agregar healthchecks,
- evitar exponer la base de datos innecesariamente,
- eliminar volúmenes de código fuente en producción,
- usar `prisma migrate deploy` en lugar de `prisma migrate dev`.

Además, OpenTelemetry permitiría mejorar la observabilidad del sistema, recolectando métricas, logs y trazas para analizar el comportamiento de la API y detectar errores, lentitud o problemas de rendimiento.

La combinación de OpenTelemetry, Prometheus y Grafana permitiría monitorear mejor la aplicación y tener mayor visibilidad sobre lo que ocurre dentro del sistema.
### VERIFICACIONES

## 4.1. Verificación técnica

Se realizaron mediciones comparando el entorno de desarrollo contra el entorno de producción.  
Las métricas relevadas incluyen tamaño de imágenes Docker, tiempo de startup, consumo de memoria, accesibilidad de endpoints y disponibilidad del frontend servido por nginx.

| Métrica | Antes (desarrollo) | Después (producción) | Mejora |
|---|---:|---:|---|
| Tamaño imagen API | `api:dev` → Disk usage: **1.63 GB** / Content size: **423 MB** | `api:prod` → Disk usage: **781 MB** / Content size: **164 MB** | Se redujo el disk usage en aprox. **849 MB**  y el content size en **259 MB**  |
| Tamaño imagen Web | `web:dev` → Disk usage: **1.51 GB** / Content size: **403 MB** | `web:prod` → Disk usage: **94.8 MB** / Content size: **26.5 MB** | Se redujo el disk usage en aprox. **1.41 GB**  y el content size en **376.5 MB** |
| Tiempo de startup API | `time docker compose up -d api` → **26.421 s** | `time docker compose -f docker-compose.prod.yml up -d api` → **15.20 s** | El arranque fue aprox. **11.22 s más rápido**, una mejora cercana al **42%** |
| Memoria API (idle) | `docker stats --no-stream alentapp-api` → **99.98 MiB / 6.684 GiB** | `docker stats --no-stream alentapp-api` → **101.2 MiB / 6.684 GiB** | Consumo prácticamente igual. En producción aumentó apenas **1.22 MiB**, por lo que no hay una mejora significativa en memoria, sino que mas bien se mantiene estable |
| Endpoints accesibles | Se probaron endpoints con `curl`, por ejemplo: `/api/v1/lockers`, `/api/v1/sport`, `/api/v1/medicalcertificate`, `/api/v1/socios`, `/api/v1/payments` | Se volvieron a probar los endpoints en producción y respondieron correctamente con JSON, por ejemplo `{ "data": [] }` | La API se mantiene accesible en ambos entornos. Además, el endpoint correcto de health es `/health`, no `/api/v1/health` |
| Frontend vía nginx | No aplica en desarrollo, ya que el frontend no se servía mediante nginx | `curl http://localhost/` devolvió el HTML del frontend y `curl -I http://localhost/` devolvió **HTTP/1.1 200 OK** con `Server: nginx/1.31.1` | El frontend queda correctamente servido por nginx en producción |

> Nota: Al probar `/api/v1/health` se obtuvo un error 404 porque esa ruta no existe.  
> El endpoint correcto de health check es `/health`, el cual respondió correctamente con:
>
> ```json
> {
>   "status": "ok",
>   "service": "API",
>   "uptime": 193.2451529
> }
> ```

### Conclusión

La versión de producción muestra una mejora clara en el tamaño de las imágenes Docker, especialmente en la imagen del frontend, que pasa de 1.51 GB a 94.8 MB.  
También se observa una reducción importante en el tiempo de startup de la API, pasando de 26.421 segundos en desarrollo a 15.20 segundos en producción.


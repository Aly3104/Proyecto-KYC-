# KYC System — Guía de despliegue con Docker

Esta guía explica cómo empaquetar y ejecutar toda la solución (MSSQL, NestJS y Next.js) con Docker y Docker Compose.

---

## Requisitos previos

| Herramienta      | Versión mínima | Descarga                          |
|------------------|----------------|-----------------------------------|
| Docker Desktop   | 24+            | https://www.docker.com/get-started|
| Docker Compose   | v2 (incluido)  | incluido con Docker Desktop       |

Verificar instalación:

```bash
docker --version
docker compose version
```

---

## Opción A — Solo la base de datos (desarrollo local)

Si desarrollas el backend y frontend en tu máquina pero necesitas SQL Server dockerizado:

```bash
docker run \
  -e "ACCEPT_EULA=Y" \
  -e "SA_PASSWORD=YourStrong!Passw0rd" \
  -p 1433:1433 \
  --name mssql-kyc \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

Esperar ~15 segundos a que arranque, luego ejecutar el esquema:

```bash
# Copiar el script al contenedor y ejecutarlo
docker cp database/schema.sql mssql-kyc:/schema.sql
docker exec -it mssql-kyc /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" \
  -C -Q "CREATE DATABASE kyc_db;"
docker exec -it mssql-kyc /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" \
  -C -d kyc_db -i /schema.sql
```

---

## Opción B — Stack completo con Docker Compose

### Estructura de archivos necesaria

Antes de ejecutar, asegúrate de tener creados los siguientes archivos en el proyecto (los Dockerfile se crean en las secciones siguientes):

```
kyc-project/
├── backend/
│   └── Dockerfile
├── frontend/
│   └── Dockerfile
├── database/
│   └── schema.sql
└── docker-compose.yml      ← se crea aquí abajo
```

---

### docker-compose.yml

Crear el archivo en la raíz del proyecto con el siguiente contenido:

```yaml
version: "3.9"

services:

  # ─── Base de datos MSSQL ───────────────────────────────────
  db:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: kyc-mssql
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "YourStrong!Passw0rd"
      MSSQL_PID: "Express"
    ports:
      - "1433:1433"
    volumes:
      - mssql_data:/var/opt/mssql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'YourStrong!Passw0rd' -C -Q 'SELECT 1'"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    networks:
      - kyc-network

  # ─── Script de inicialización de la DB ────────────────────
  db-init:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: kyc-db-init
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./database/schema.sql:/schema.sql
    entrypoint: >
      /bin/bash -c "
        /opt/mssql-tools18/bin/sqlcmd -S db -U sa -P 'YourStrong!Passw0rd' -C -Q 'IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = ''kyc_db'') CREATE DATABASE kyc_db;' &&
        /opt/mssql-tools18/bin/sqlcmd -S db -U sa -P 'YourStrong!Passw0rd' -C -d kyc_db -i /schema.sql
      "
    networks:
      - kyc-network
    restart: "no"

  # ─── API NestJS ────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: kyc-backend
    depends_on:
      db:
        condition: service_healthy
      db-init:
        condition: service_completed_successfully
    environment:
      PORT: 3001
      NODE_ENV: production
      DATABASE_URL: "sqlserver://db:1433;database=kyc_db;user=sa;password=YourStrong%21Passw0rd;encrypt=false;trustServerCertificate=true"
      BETTER_AUTH_SECRET: "cambia_este_secreto_por_uno_seguro_min_32_chars"
      BETTER_AUTH_URL: "http://localhost:3001"
      FRONTEND_URL: "http://localhost:3000"
    ports:
      - "3001:3001"
    networks:
      - kyc-network

  # ─── Frontend Next.js ──────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: kyc-frontend
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:3001"
      API_INTERNAL_URL: "http://backend:3001"
      BETTER_AUTH_SECRET: "cambia_este_secreto_por_uno_seguro_min_32_chars"
      BETTER_AUTH_URL: "http://backend:3001"
    ports:
      - "3000:3000"
    networks:
      - kyc-network

volumes:
  mssql_data:

networks:
  kyc-network:
    driver: bridge
```

> **Importante:** Cambiar `YourStrong!Passw0rd` y `BETTER_AUTH_SECRET` por valores propios antes de usar en cualquier entorno que no sea local.

---

### Dockerfile — Backend (NestJS)

Crear `backend/Dockerfile`:

```dockerfile
# Stage 1: install dependencies
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Stage 2: build NestJS and Prisma client
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="sqlserver://localhost:1433;database=kyc_db;user=sa;password=YourStrong%21Passw0rd;encrypt=false;trustServerCertificate=true"

RUN npx prisma generate
RUN npm run build

# Stage 3: production runtime
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3001

CMD ["node", "dist/main.js"]
```

---

### Dockerfile — Frontend (Next.js)

Crear `frontend/Dockerfile`:

```dockerfile
# ── Etapa 1: dependencias ───────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Etapa 2: build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Etapa 3: producción ─────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

> El Dockerfile de Next.js requiere `output: 'standalone'` en `next.config.js`:

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
```

---

## Levantar el stack completo

```bash
# Construir imágenes y levantar todos los servicios
docker compose up --build

# En segundo plano (detached)
docker compose up --build -d

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
```

La aplicación estará disponible en:

| Servicio  | URL                   |
|-----------|-----------------------|
| Frontend  | http://localhost:3000 |
| API REST  | http://localhost:3001 |
| MSSQL     | localhost:1433        |

---

## Comandos útiles

```bash
# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes (borra los datos de la DB)
docker compose down -v

# Reconstruir un servicio específico sin afectar los demás
docker compose up --build backend

# Ejecutar una migración / script SQL manualmente contra el contenedor
docker exec -it kyc-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" \
  -C -d kyc_db -Q "SELECT * FROM kyc.clients;"

# Acceder a la shell del contenedor backend
docker exec -it kyc-backend sh

# Ver el estado de los contenedores
docker compose ps
```

---

## Solución de problemas comunes

### MSSQL tarda en arrancar

El contenedor de SQL Server necesita hasta 30 segundos en el primer arranque. El `healthcheck` en el `docker-compose.yml` resuelve esto: los demás servicios esperan a que la DB esté lista.

### Error de contraseña en SQL Server

La contraseña de SA debe cumplir la política de SQL Server:
- Mínimo 8 caracteres
- Mayúsculas, minúsculas, dígitos y símbolos
- Ejemplo válido: `YourStrong!Passw0rd`

### Puerto 1433 ocupado

Si tienes SQL Server instalado localmente, el puerto 1433 ya está en uso. Cambiar el mapeo en `docker-compose.yml`:

```yaml
ports:
  - "1434:1433"   # usar 1434 en el host
```

Y actualizar `DB_PORT=1434` en el servicio `backend`.

### Errores de CORS

Verificar que `FRONTEND_URL` en el backend coincida exactamente con la URL donde corre Next.js (incluyendo protocolo y puerto).

# KYC System — Prueba Técnica NextJS & NestJS

Sistema básico de Debida Diligencia (KYC) con registro de clientes, evaluación automática de riesgo, alertas y autenticación por roles.

## Stack

| Componente   | Tecnología              |
|--------------|-------------------------|
| Frontend     | Next.js 14+ (App Router)|
| Backend      | NestJS                  |
| Autenticación| Better Auth             |
| Base de datos| Microsoft SQL Server    |

---

## Estructura del repositorio

```
kyc-project/
├── backend/          # API NestJS
├── frontend/         # Aplicación Next.js
├── database/
│   └── schema.sql    # Esquema y datos semilla MSSQL
├── scripts/
│   └── seed-users.mjs # Crea usuarios demo admin / analista
├── README.md
└── DOCKER.md         # Guía de despliegue con Docker
```

---

## Requisitos previos

| Herramienta   | Versión mínima | Descarga                              |
|---------------|----------------|---------------------------------------|
| Node.js       | 20 LTS         | https://nodejs.org                    |
| npm           | 10+            | incluido con Node                     |
| SQL Server    | 2019 o 2022    | https://www.microsoft.com/sql-server  |

> **Alternativa a SQL Server local:** ver [DOCKER.md](./DOCKER.md) para levantar MSSQL con Docker en un solo comando.

---

## 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd kyc-project
```

---

## 2. Base de datos

### 2.1 Crear la base de datos

En SSMS o `sqlcmd`, crear la base de datos antes de ejecutar el esquema:

```sql
CREATE DATABASE kyc_db;
GO
USE kyc_db;
GO
```

### 2.2 Ejecutar el esquema

```bash
# Opción A — sqlcmd (CLI)
sqlcmd -S localhost -U sa -P "YourStrong!Passw0rd" -d kyc_db -i database/schema.sql

# Opción B — SSMS
# Abrir database/schema.sql y ejecutar contra la base de datos kyc_db
```

El script crea el esquema `kyc`, todas las tablas y los datos semilla de catálogos (nacionalidades, actividades económicas, orígenes de fondos).

### 2.3 Justificación del esquema

Se normalizó el esquema con las siguientes decisiones respecto a un diseño plano:

| Decisión | Razón |
|----------|-------|
| Separar `nationalities`, `economic_activities`, `fund_origins` en catálogos | Evitar texto libre inconsistente y poder asignar `risk_weight` configurable sin tocar código |
| Campo `is_foreign` en `nationalities` | La regla "Extranjero + efectivo alto → ALTO" se evalúa con JOIN, no con comparación de strings |
| Campo `is_cash` en `fund_origins` | Identifica explícitamente pagos en efectivo para disparar la alerta `EFECTIVO_ALTO` |
| Tablas de auth en camelCase (`userId`, `expiresAt`…) | Better Auth espera exactamente esas columnas; evita cualquier mapeo adicional |
| `alerts.client_id` con `ON DELETE CASCADE` | Al eliminar un cliente se eliminan sus alertas, manteniendo integridad referencial automáticamente |

---

## 3. Backend (NestJS)

### 3.1 Variables de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp backend/.env.example backend/.env
```

Contenido de `backend/.env`:

```env
# Servidor
PORT=3001
NODE_ENV=development

# Base de datos (MSSQL / Prisma)
DATABASE_URL="sqlserver://localhost:1433;database=kyc_db;user=sa;password=YourStrong%21Passw0rd;encrypt=false;trustServerCertificate=true"

# Better Auth
BETTER_AUTH_SECRET=cambia_este_secreto_por_uno_seguro_min_32_chars
BETTER_AUTH_URL=http://localhost:3001

# Frontend (CORS)
FRONTEND_URL=http://localhost:3000
```

### 3.2 Instalar dependencias

```bash
cd backend
npm install
```

Dependencias principales que se instalarán:

```
@nestjs/common @nestjs/core @nestjs/platform-express
@nestjs/config
class-validator class-transformer
better-auth
uuid
```

### 3.3 Ejecutar en desarrollo

```bash
npm run start:dev
```

La API queda disponible en: `http://localhost:3001`

### 3.4 Crear usuarios demo

Con la API ejecutándose, crear usuarios iniciales para poder ingresar al sistema:

```bash
# Desde la raíz del proyecto
node scripts/seed-users.mjs
```

El script crea estos usuarios si no existen:

| Rol      | Email               | Password     |
|----------|---------------------|--------------|
| admin    | `admin@kyc.local`   | `Admin123!`  |
| analista | `analista@kyc.local`| `Analista123!` |

> Estas credenciales son solo para demo local de la prueba técnica. Para otro entorno, cambiar los valores antes de usarlos.

Si la API corre en otra URL:

```bash
KYC_API_URL=http://localhost:3001 node scripts/seed-users.mjs
```

### 3.5 Endpoints principales

| Método | Ruta                  | Descripción                               | Rol requerido      |
|--------|-----------------------|-------------------------------------------|--------------------|
| ALL    | `/auth/*`             | Endpoints gestionados por Better Auth     | —                  |
| POST   | `/clients`            | Crear cliente KYC                         | admin / analista   |
| GET    | `/clients`            | Listar todos los clientes                 | admin / analista   |
| GET    | `/clients/:id`        | Obtener un cliente por ID                 | admin / analista   |
| GET    | `/alerts`             | Listar alertas del sistema                | admin / analista   |
| PATCH  | `/alerts/:id/resolve` | Marcar alerta como resuelta               | admin              |

> Better Auth expone sus endpoints bajo `/auth/*` (por ejemplo, registro, login, sesión y logout).

---

## 4. Frontend (Next.js)

### 4.1 Variables de entorno

```bash
cp frontend/.env.example frontend/.env.local
```

Contenido de `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
API_INTERNAL_URL=http://localhost:3001
BETTER_AUTH_SECRET=cambia_este_secreto_por_uno_seguro_min_32_chars
BETTER_AUTH_URL=http://localhost:3001
```

> `BETTER_AUTH_SECRET` debe ser el mismo valor que en el backend.

### 4.2 Instalar dependencias

```bash
cd frontend
npm install
```

Dependencias principales:

```
next react react-dom
better-auth
tailwindcss
react-hook-form
```

### 4.3 Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación queda disponible en: `http://localhost:3000`

---

## 5. Ejecutar ambos servicios simultáneamente

Desde la raíz del proyecto (requiere tener ambas carpetas con sus `.env` configurados):

```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

O instalar `concurrently` en la raíz:

```bash
npm install -D concurrently
# Luego en package.json raíz agregar:
# "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\""
npm run dev
```

---

## 6. Lógica de evaluación de riesgo

El backend calcula automáticamente el `risk_level` al crear un cliente aplicando la siguiente lógica:

```
score = nationality.is_foreign * 3
      + economic_activity.risk_weight
      + fund_origin.risk_weight
      + (estimated_monthly_amount > 5,000,000 ? 3 : 0)
      + (fund_origin.is_cash && estimated_monthly_amount > 2,000,000 ? 4 : 0)

risk_level = score >= 8 ? 'ALTO'
           : score >= 4 ? 'MEDIO'
           :               'BAJO'
```

**Alertas generadas automáticamente:**

| Condición                                              | Tipo de alerta              |
|--------------------------------------------------------|-----------------------------|
| `fund_origin.is_cash` y monto > 2,000,000              | `EFECTIVO_ALTO`             |
| `nationality.is_foreign` y `is_cash` alto              | `EXTRANJERO_EFECTIVO_ALTO`  |
| `risk_level === 'ALTO'`                                | `RIESGO_ALTO`               |
| Actividad u origen contienen `"no declarad"`           | `DATOS_INCOMPLETOS`         |
| `fund_origin.name` contiene `"terceros"`               | `USO_TERCEROS`              |

**Escenarios rápidos para demostrar alertas específicas en la UI:**

| Alerta esperada | Datos de ejemplo |
|-----------------|------------------|
| `EFECTIVO_ALTO` | Nacionalidad: Colombia · Actividad: Empleado / Asalariado · Origen: Efectivo (cash) · Monto: 2,500,000 |
| `USO_TERCEROS` | Nacionalidad: Colombia · Actividad: Empleado / Asalariado · Origen: Fondos de terceros · Monto: 1,000,000 |
| `DATOS_INCOMPLETOS` | Nacionalidad: Colombia · Actividad: Actividad no declarada · Origen: Salario / Nómina · Monto: 500,000 |

El formulario de registro muestra una previsualización automática con el nivel de riesgo y los badges de alertas esperadas antes de guardar el cliente. Después del registro, el listado de clientes, el detalle del cliente y la pantalla de alertas muestran los tipos de alertas activas de forma visible.

---

## 7. Scripts disponibles

### Backend

| Script              | Descripción                        |
|---------------------|------------------------------------|
| `npm run start:dev` | Desarrollo con hot-reload          |
| `npm run build`     | Compilar a producción              |
| `npm run start:prod`| Ejecutar build de producción       |
| `npm run lint`      | Validar TypeScript sin emitir archivos |

### Frontend

| Script          | Descripción                   |
|-----------------|-------------------------------|
| `npm run dev`   | Desarrollo con hot-reload     |
| `npm run build` | Compilar para producción      |
| `npm start`     | Servidor de producción        |
| `npm run lint`  | Lintear el código             |

---

## 8. Despliegue con Docker

Ver [DOCKER.md](./DOCKER.md) para instrucciones completas de contenedorización y despliegue con `docker-compose`.

---

## 9. Roles y permisos

| Rol      | Puede registrar clientes | Puede ver clientes | Puede resolver alertas |
|----------|--------------------------|-------------------|------------------------|
| admin    | ✅                        | ✅                 | ✅                      |
| analista | ✅                        | ✅                 | ❌                      |

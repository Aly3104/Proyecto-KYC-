# Usamos Alpine que es más ligero y compatible con Prisma en estos casos
FROM node:20-alpine

# Instalamos las librerías que Prisma necesita para Windows/Docker
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos todo
RUN npm install

# Copiamos el resto del código
COPY . .

# Generamos el cliente de Prisma
RUN npx prisma generate

# Exponemos el puerto que pide la prueba (o el 3000)
EXPOSE 3001

# IMPORTANTE: Usamos 'start:dev' para que el contenedor se reinicie solo al cambiar código
CMD ["npm", "run", "start:dev"]
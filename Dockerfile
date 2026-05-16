# Multi-stage Dockerfile: build the Vite frontend and serve it from the backend

FROM node:18-alpine AS build-frontend
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY frontend ./frontend
COPY vite.config.js tailwind.config.js postcss.config.cjs ./

RUN npm run build

FROM node:18-alpine
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

COPY backend ./backend
COPY --from=build-frontend /app/frontend/dist ./backend/public

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "backend/server.js"]

FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ARG ENV_FILE=.env.production

COPY --from=builder /app/${ENV_FILE} ./.env
COPY --from=builder /app/${ENV_FILE} ./${ENV_FILE}

EXPOSE 3333

CMD ["npm", "start"]
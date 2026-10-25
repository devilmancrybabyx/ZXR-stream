# ZXR Stream - Stremio & Nuvio Arabic Addon
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=7000
ENV HOST=0.0.0.0

EXPOSE 7000

CMD ["node", "server.js"]

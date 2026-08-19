FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

# Only start the server — run migrate manually via shell
CMD ["node", "server.js"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Run migrations then start the server
CMD ["sh", "-c", "node src/db/migrate.js && node src/db/seed.js && node src/server.js"]

EXPOSE 5000

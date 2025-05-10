FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Default command - this will be overridden by entrypoint in docker-compose
CMD ["node", "index.js"]

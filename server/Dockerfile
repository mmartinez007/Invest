FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose port (Cloud Run sets PORT env var, defaults to 8080 inside container)
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]

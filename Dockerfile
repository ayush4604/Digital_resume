FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Expose Hugging Face Default Port
EXPOSE 7860

# Ensure the app binds to 0.0.0.0
ENV HOST=0.0.0.0
ENV PORT=7860

CMD ["node", "admin-server.js"]

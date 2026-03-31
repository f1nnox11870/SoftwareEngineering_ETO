FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p uploads/posts uploads/banners uploads/slips

EXPOSE 3001

CMD ["node", "server.js"]
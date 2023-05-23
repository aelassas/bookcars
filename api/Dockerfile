FROM --platform=linux/amd64 node:18

WORKDIR /app
COPY package.json package-lock.json /app/

RUN npm install

COPY . .

EXPOSE 4002

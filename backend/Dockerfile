FROM --platform=linux/amd64 node:18

WORKDIR /backend

COPY package.json package-lock.json ./

RUN npm install

COPY . .

EXPOSE 3000

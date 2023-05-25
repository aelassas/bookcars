FROM node:18

WORKDIR /backend
RUN npm install -g serve

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

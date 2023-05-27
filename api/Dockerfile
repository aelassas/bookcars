FROM  node:20

WORKDIR /api
COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npx tsc

EXPOSE 4002

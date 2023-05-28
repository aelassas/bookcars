FROM  node:20

WORKDIR /frontend
RUN npm install -g serve

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001


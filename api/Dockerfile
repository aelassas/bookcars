FROM node:18-alpine
RUN mkdir -p /api
WORKDIR /api
RUN mkdir -p /var/www/cdn/bookcars/users
RUN mkdir -p /var/www/cdn/bookcars/temp/users
RUN mkdir -p /var/www/cdn/bookcars/cars
RUN mkdir -p /var/www/cdn/bookcars/temp/cars
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY . .
EXPOSE 4002
CMD [ "npm", "start"]
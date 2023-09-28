# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /bookcars/api
COPY ./api ./
COPY ./packages /bookcars/packages
RUN mkdir -p /var/www/cdn/bookcars/users
RUN mkdir -p /var/www/cdn/bookcars/temp/users
RUN mkdir -p /var/www/cdn/bookcars/cars
RUN mkdir -p /var/www/cdn/bookcars/temp/cars
RUN npm install --omit=dev
CMD [ "npm", "start"]
EXPOSE 4002

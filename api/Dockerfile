# syntax=docker/dockerfile:1

FROM node:18-alpine
WORKDIR /api
COPY . .
RUN mkdir -p /var/www/cdn/bookcars/users
RUN mkdir -p /var/www/cdn/bookcars/temp/users
RUN mkdir -p /var/www/cdn/bookcars/cars
RUN mkdir -p /var/www/cdn/bookcars/temp/cars
RUN npm install --omit=dev
CMD [ "npm", "start"]
EXPOSE 4002
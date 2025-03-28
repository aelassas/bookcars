# syntax=docker/dockerfile:1

FROM node:lts-alpine as build
WORKDIR /bookcars/backoffice
COPY ./backoffice ./
COPY ./backoffice/.env.docker .env
COPY ./packages /bookcars/packages
RUN npm install --force
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf -- *
COPY --from=build /bookcars/backoffice/build .
COPY ./backoffice/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 3001

# syntax=docker/dockerfile:1

FROM node:lts-alpine as build
WORKDIR /bookcars/admin
COPY ./admin ./
COPY ./admin/.env.docker .env
COPY ./packages /bookcars/packages
RUN npm install --force
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf -- *
COPY --from=build /bookcars/admin/build .
COPY ./admin/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 3001

# syntax=docker/dockerfile:1

FROM node:lts-alpine as build
WORKDIR /bookcars/backend
COPY ./backend ./
COPY ./backend/.env.docker .env
COPY ./packages /bookcars/packages
RUN npm install
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf -- *
COPY --from=build /bookcars/backend/build .
COPY ./backend/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 3001

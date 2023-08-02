# syntax=docker/dockerfile:1

FROM node:18-alpine as build
WORKDIR /backend
COPY . .
COPY ./.env.docker ./.env
RUN npm install
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /backend/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 3001
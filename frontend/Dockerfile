FROM node:18-alpine as build
RUN mkdir /frontend
WORKDIR /frontend
ENV PATH /frontend/node_modules/.bin:$PATH
COPY ./package.json ./package-lock.json ./
RUN npm ci
COPY . .
COPY ./.env.docker ./.env
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /frontend/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/
EXPOSE 3002
CMD ["nginx", "-g", "daemon off;"]
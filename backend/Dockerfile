FROM node:18-alpine as build
RUN mkdir /backend
WORKDIR /backend
ENV PATH /backend/node_modules/.bin:$PATH
COPY ./package.json ./package-lock.json ./
RUN npm ci
COPY . .
COPY ./.env.docker ./.env
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /backend/build /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
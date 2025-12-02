# syntax=docker/dockerfile:1

FROM node:lts-alpine AS build
WORKDIR /bookcars/admin

# Build arguments for build-time environment variables
ARG VITE_BC_API_HOST
ARG VITE_BC_WEBSITE_NAME
ARG VITE_BC_DEFAULT_LANGUAGE

# Copy files
COPY ./admin ./
COPY ./admin/.env.docker .env
COPY ./packages /bookcars/packages

# Create .env file from build args (overrides .env.docker if args are provided)
RUN if [ -n "$VITE_BC_API_HOST" ]; then echo "VITE_BC_API_HOST=$VITE_BC_API_HOST" >> .env; fi && \
    if [ -n "$VITE_BC_WEBSITE_NAME" ]; then echo "VITE_BC_WEBSITE_NAME=$VITE_BC_WEBSITE_NAME" >> .env; fi && \
    if [ -n "$VITE_BC_DEFAULT_LANGUAGE" ]; then echo "VITE_BC_DEFAULT_LANGUAGE=$VITE_BC_DEFAULT_LANGUAGE" >> .env; fi

RUN npm install --force
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf -- *
COPY --from=build /bookcars/admin/build .
COPY ./admin/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 3001

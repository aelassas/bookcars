# syntax=docker/dockerfile:1

FROM node:lts-alpine AS build
WORKDIR /bookcars/frontend

# Build arguments for build-time environment variables
ARG VITE_BC_API_HOST
ARG VITE_BC_WEBSITE_NAME
ARG VITE_BC_DEFAULT_LANGUAGE
ARG VITE_BC_BASE_CURRENCY
ARG VITE_BC_STRIPE_PUBLISHABLE_KEY
ARG VITE_BC_PAYPAL_CLIENT_ID

# Copy files
COPY ./frontend ./
COPY ./packages /bookcars/packages

# Create .env file (start with .env.docker if it exists, otherwise create empty)
RUN if [ -f .env.docker ]; then cp .env.docker .env; else touch .env; fi

# Add build args to .env file (overrides .env.docker values if provided)
RUN if [ -n "$VITE_BC_API_HOST" ]; then echo "VITE_BC_API_HOST=$VITE_BC_API_HOST" >> .env; fi && \
    if [ -n "$VITE_BC_WEBSITE_NAME" ]; then echo "VITE_BC_WEBSITE_NAME=$VITE_BC_WEBSITE_NAME" >> .env; fi && \
    if [ -n "$VITE_BC_DEFAULT_LANGUAGE" ]; then echo "VITE_BC_DEFAULT_LANGUAGE=$VITE_BC_DEFAULT_LANGUAGE" >> .env; fi && \
    if [ -n "$VITE_BC_BASE_CURRENCY" ]; then echo "VITE_BC_BASE_CURRENCY=$VITE_BC_BASE_CURRENCY" >> .env; fi && \
    if [ -n "$VITE_BC_STRIPE_PUBLISHABLE_KEY" ]; then echo "VITE_BC_STRIPE_PUBLISHABLE_KEY=$VITE_BC_STRIPE_PUBLISHABLE_KEY" >> .env; fi && \
    if [ -n "$VITE_BC_PAYPAL_CLIENT_ID" ]; then echo "VITE_BC_PAYPAL_CLIENT_ID=$VITE_BC_PAYPAL_CLIENT_ID" >> .env; fi

RUN npm install --force
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf -- *
COPY --from=build /bookcars/frontend/build .
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
EXPOSE 443

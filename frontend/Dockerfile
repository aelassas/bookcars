# syntax=docker/dockerfile:1

FROM node:lts-alpine AS build
WORKDIR /bookcars/frontend

# Build arguments for build-time environment variables
# Core configuration
ARG VITE_BC_API_HOST
ARG VITE_BC_WEBSITE_NAME
ARG VITE_BC_DEFAULT_LANGUAGE
ARG VITE_BC_BASE_CURRENCY
ARG VITE_NODE_ENV=production

# Payment gateways
ARG VITE_BC_PAYMENT_GATEWAY
ARG VITE_BC_STRIPE_PUBLISHABLE_KEY
ARG VITE_BC_PAYPAL_CLIENT_ID
ARG VITE_BC_PAYPAL_DEBUG

# Pagination and page sizes
ARG VITE_BC_PAGE_SIZE
ARG VITE_BC_CARS_PAGE_SIZE
ARG VITE_BC_BOOKINGS_PAGE_SIZE
ARG VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE
ARG VITE_BC_PAGINATION_MODE

# CDN paths
ARG VITE_BC_CDN_USERS
ARG VITE_BC_CDN_CARS
ARG VITE_BC_CDN_LOCATIONS
ARG VITE_BC_CDN_LICENSES
ARG VITE_BC_CDN_TEMP_LICENSES

# Image dimensions
ARG VITE_BC_SUPPLIER_IMAGE_WIDTH
ARG VITE_BC_SUPPLIER_IMAGE_HEIGHT
ARG VITE_BC_CAR_IMAGE_WIDTH
ARG VITE_BC_CAR_IMAGE_HEIGHT

# reCAPTCHA
ARG VITE_BC_RECAPTCHA_ENABLED
ARG VITE_BC_RECAPTCHA_SITE_KEY

# Other settings
ARG VITE_BC_MINIMUM_AGE
ARG VITE_BC_SET_LANGUAGE_FROM_IP
ARG VITE_BC_GOOGLE_ANALYTICS_ENABLED
ARG VITE_BC_GOOGLE_ANALYTICS_ID
ARG VITE_BC_CONTACT_EMAIL
ARG VITE_BC_DEPOSIT_FILTER_VALUE_1
ARG VITE_BC_DEPOSIT_FILTER_VALUE_2
ARG VITE_BC_DEPOSIT_FILTER_VALUE_3
ARG VITE_BC_FB_APP_ID
ARG VITE_BC_APPLE_ID
ARG VITE_BC_GG_APP_ID
ARG VITE_BC_MIN_LOCATIONS
ARG VITE_BC_HIDE_SUPPLIERS
ARG VITE_BC_MAP_LATITUDE
ARG VITE_BC_MAP_LONGITUDE
ARG VITE_BC_MAP_ZOOM

# Copy files
COPY ./frontend ./
COPY ./packages /bookcars/packages

# Create .env file (start with .env.docker if it exists, otherwise create empty)
RUN if [ -f .env.docker ]; then cp .env.docker .env; else touch .env; fi

# Add build args to .env file (overrides .env.docker values if provided)
# Using a more efficient approach with a single RUN command
RUN { \
  [ -n "$VITE_BC_API_HOST" ] && echo "VITE_BC_API_HOST=$VITE_BC_API_HOST" >> .env || true; \
  [ -n "$VITE_BC_WEBSITE_NAME" ] && echo "VITE_BC_WEBSITE_NAME=$VITE_BC_WEBSITE_NAME" >> .env || true; \
  [ -n "$VITE_BC_DEFAULT_LANGUAGE" ] && echo "VITE_BC_DEFAULT_LANGUAGE=$VITE_BC_DEFAULT_LANGUAGE" >> .env || true; \
  [ -n "$VITE_BC_BASE_CURRENCY" ] && echo "VITE_BC_BASE_CURRENCY=$VITE_BC_BASE_CURRENCY" >> .env || true; \
  [ -n "$VITE_NODE_ENV" ] && echo "VITE_NODE_ENV=$VITE_NODE_ENV" >> .env || true; \
  [ -n "$VITE_BC_PAYMENT_GATEWAY" ] && echo "VITE_BC_PAYMENT_GATEWAY=$VITE_BC_PAYMENT_GATEWAY" >> .env || true; \
  [ -n "$VITE_BC_STRIPE_PUBLISHABLE_KEY" ] && echo "VITE_BC_STRIPE_PUBLISHABLE_KEY=$VITE_BC_STRIPE_PUBLISHABLE_KEY" >> .env || true; \
  [ -n "$VITE_BC_PAYPAL_CLIENT_ID" ] && echo "VITE_BC_PAYPAL_CLIENT_ID=$VITE_BC_PAYPAL_CLIENT_ID" >> .env || true; \
  [ -n "$VITE_BC_PAYPAL_DEBUG" ] && echo "VITE_BC_PAYPAL_DEBUG=$VITE_BC_PAYPAL_DEBUG" >> .env || true; \
  [ -n "$VITE_BC_PAGE_SIZE" ] && echo "VITE_BC_PAGE_SIZE=$VITE_BC_PAGE_SIZE" >> .env || true; \
  [ -n "$VITE_BC_CARS_PAGE_SIZE" ] && echo "VITE_BC_CARS_PAGE_SIZE=$VITE_BC_CARS_PAGE_SIZE" >> .env || true; \
  [ -n "$VITE_BC_BOOKINGS_PAGE_SIZE" ] && echo "VITE_BC_BOOKINGS_PAGE_SIZE=$VITE_BC_BOOKINGS_PAGE_SIZE" >> .env || true; \
  [ -n "$VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE" ] && echo "VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE=$VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE" >> .env || true; \
  [ -n "$VITE_BC_PAGINATION_MODE" ] && echo "VITE_BC_PAGINATION_MODE=$VITE_BC_PAGINATION_MODE" >> .env || true; \
  [ -n "$VITE_BC_CDN_USERS" ] && echo "VITE_BC_CDN_USERS=$VITE_BC_CDN_USERS" >> .env || true; \
  [ -n "$VITE_BC_CDN_CARS" ] && echo "VITE_BC_CDN_CARS=$VITE_BC_CDN_CARS" >> .env || true; \
  [ -n "$VITE_BC_CDN_LOCATIONS" ] && echo "VITE_BC_CDN_LOCATIONS=$VITE_BC_CDN_LOCATIONS" >> .env || true; \
  [ -n "$VITE_BC_CDN_LICENSES" ] && echo "VITE_BC_CDN_LICENSES=$VITE_BC_CDN_LICENSES" >> .env || true; \
  [ -n "$VITE_BC_CDN_TEMP_LICENSES" ] && echo "VITE_BC_CDN_TEMP_LICENSES=$VITE_BC_CDN_TEMP_LICENSES" >> .env || true; \
  [ -n "$VITE_BC_SUPPLIER_IMAGE_WIDTH" ] && echo "VITE_BC_SUPPLIER_IMAGE_WIDTH=$VITE_BC_SUPPLIER_IMAGE_WIDTH" >> .env || true; \
  [ -n "$VITE_BC_SUPPLIER_IMAGE_HEIGHT" ] && echo "VITE_BC_SUPPLIER_IMAGE_HEIGHT=$VITE_BC_SUPPLIER_IMAGE_HEIGHT" >> .env || true; \
  [ -n "$VITE_BC_CAR_IMAGE_WIDTH" ] && echo "VITE_BC_CAR_IMAGE_WIDTH=$VITE_BC_CAR_IMAGE_WIDTH" >> .env || true; \
  [ -n "$VITE_BC_CAR_IMAGE_HEIGHT" ] && echo "VITE_BC_CAR_IMAGE_HEIGHT=$VITE_BC_CAR_IMAGE_HEIGHT" >> .env || true; \
  [ -n "$VITE_BC_RECAPTCHA_ENABLED" ] && echo "VITE_BC_RECAPTCHA_ENABLED=$VITE_BC_RECAPTCHA_ENABLED" >> .env || true; \
  [ -n "$VITE_BC_RECAPTCHA_SITE_KEY" ] && echo "VITE_BC_RECAPTCHA_SITE_KEY=$VITE_BC_RECAPTCHA_SITE_KEY" >> .env || true; \
  [ -n "$VITE_BC_MINIMUM_AGE" ] && echo "VITE_BC_MINIMUM_AGE=$VITE_BC_MINIMUM_AGE" >> .env || true; \
  [ -n "$VITE_BC_SET_LANGUAGE_FROM_IP" ] && echo "VITE_BC_SET_LANGUAGE_FROM_IP=$VITE_BC_SET_LANGUAGE_FROM_IP" >> .env || true; \
  [ -n "$VITE_BC_GOOGLE_ANALYTICS_ENABLED" ] && echo "VITE_BC_GOOGLE_ANALYTICS_ENABLED=$VITE_BC_GOOGLE_ANALYTICS_ENABLED" >> .env || true; \
  [ -n "$VITE_BC_GOOGLE_ANALYTICS_ID" ] && echo "VITE_BC_GOOGLE_ANALYTICS_ID=$VITE_BC_GOOGLE_ANALYTICS_ID" >> .env || true; \
  [ -n "$VITE_BC_CONTACT_EMAIL" ] && echo "VITE_BC_CONTACT_EMAIL=$VITE_BC_CONTACT_EMAIL" >> .env || true; \
  [ -n "$VITE_BC_DEPOSIT_FILTER_VALUE_1" ] && echo "VITE_BC_DEPOSIT_FILTER_VALUE_1=$VITE_BC_DEPOSIT_FILTER_VALUE_1" >> .env || true; \
  [ -n "$VITE_BC_DEPOSIT_FILTER_VALUE_2" ] && echo "VITE_BC_DEPOSIT_FILTER_VALUE_2=$VITE_BC_DEPOSIT_FILTER_VALUE_2" >> .env || true; \
  [ -n "$VITE_BC_DEPOSIT_FILTER_VALUE_3" ] && echo "VITE_BC_DEPOSIT_FILTER_VALUE_3=$VITE_BC_DEPOSIT_FILTER_VALUE_3" >> .env || true; \
  [ -n "$VITE_BC_FB_APP_ID" ] && echo "VITE_BC_FB_APP_ID=$VITE_BC_FB_APP_ID" >> .env || true; \
  [ -n "$VITE_BC_APPLE_ID" ] && echo "VITE_BC_APPLE_ID=$VITE_BC_APPLE_ID" >> .env || true; \
  [ -n "$VITE_BC_GG_APP_ID" ] && echo "VITE_BC_GG_APP_ID=$VITE_BC_GG_APP_ID" >> .env || true; \
  [ -n "$VITE_BC_MIN_LOCATIONS" ] && echo "VITE_BC_MIN_LOCATIONS=$VITE_BC_MIN_LOCATIONS" >> .env || true; \
  [ -n "$VITE_BC_HIDE_SUPPLIERS" ] && echo "VITE_BC_HIDE_SUPPLIERS=$VITE_BC_HIDE_SUPPLIERS" >> .env || true; \
  [ -n "$VITE_BC_MAP_LATITUDE" ] && echo "VITE_BC_MAP_LATITUDE=$VITE_BC_MAP_LATITUDE" >> .env || true; \
  [ -n "$VITE_BC_MAP_LONGITUDE" ] && echo "VITE_BC_MAP_LONGITUDE=$VITE_BC_MAP_LONGITUDE" >> .env || true; \
  [ -n "$VITE_BC_MAP_ZOOM" ] && echo "VITE_BC_MAP_ZOOM=$VITE_BC_MAP_ZOOM" >> .env || true; \
}

RUN npm install --force
RUN npm run build

FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Copy runtime env injection script
COPY ./frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN rm -rf -- *
COPY --from=build /bookcars/frontend/build .

# Copy nginx configuration
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Use entrypoint script that can inject runtime env vars if needed
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
EXPOSE 443

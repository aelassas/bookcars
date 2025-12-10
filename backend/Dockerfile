# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /bookcars/backend
COPY ./backend ./
# Copy .env.docker if it exists, otherwise create empty .env file
# Runtime environment variables will be provided by Kubernetes secrets
RUN if [ -f .env.docker ]; then cp .env.docker .env; else touch .env; fi
COPY ./packages /bookcars/packages
RUN npm install

# Build the application during image creation (not at runtime)
RUN npm run build

# Use the new start-with-setup entry point that handles both setup and server startup
# This avoids rebuilding on every container start and handles setup properly
CMD [ "node", "--import", "./dist/src/monitoring/instrument.js", "dist/src/start-with-setup.js" ]
EXPOSE 3000

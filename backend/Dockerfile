# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /bookcars/backend
COPY ./backend ./
# Copy .env.docker if it exists, otherwise create empty .env file
# Runtime environment variables will be provided by Kubernetes secrets
RUN if [ -f .env.docker ]; then cp .env.docker .env; else touch .env; fi
COPY ./packages /bookcars/packages
RUN npm install

CMD [ "npm", "run", "start:setup"]
EXPOSE 3000

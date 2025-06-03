# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /bookdress/api
COPY ./api ./
COPY ./api/.env.docker .env
COPY ./packages /bookdress/packages
RUN npm install
RUN npm run build

# Create startup script that initializes admin user
RUN echo '#!/bin/sh' > /startup.sh && \
    echo 'echo "Starting BookDress API..."' >> /startup.sh && \
    echo 'echo "Waiting for MongoDB to be ready..."' >> /startup.sh && \
    echo 'sleep 10' >> /startup.sh && \
    echo 'echo "Initializing admin user..."' >> /startup.sh && \
    echo 'node dist/src/scripts/init-admin.js || echo "Admin initialization failed or already exists"' >> /startup.sh && \
    echo 'echo "Starting API server..."' >> /startup.sh && \
    echo 'npm start' >> /startup.sh && \
    chmod +x /startup.sh

CMD ["/startup.sh"]
EXPOSE 4002

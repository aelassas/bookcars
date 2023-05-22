FROM node:16

WORKDIR /app
COPY package.json package-lock.json /app/
#RUN yarn install --frozen-lockfile
#COPY . .

RUN npm install
EXPOSE 4002
CMD ["npm", "start -V"]
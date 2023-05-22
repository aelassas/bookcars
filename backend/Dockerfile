FROM node:16

WORKDIR /backend
COPY package.json package-lock.json /backend/
#RUN yarn install --frozen-lockfile
#COPY . .

RUN npm install
EXPOSE 3000
CMD ["npm", "start -V"]
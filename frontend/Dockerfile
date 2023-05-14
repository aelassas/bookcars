FROM node:16

WORKDIR /frontend
COPY package.json package-lock.json /frontend/
#RUN yarn install --frozen-lockfile
#COPY . .

RUN npm install
EXPOSE 3001
CMD ["npm", "start -V"]
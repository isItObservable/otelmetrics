FROM node:18-alpine

WORKDIR /app
COPY *.js .
COPY package*.json ./

COPY public/ public/
COPY views/ views/
COPY config/ config/
RUN npm install
RUN ls
ENTRYPOINT [ "npm", "start" ]
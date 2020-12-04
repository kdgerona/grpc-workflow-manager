FROM node:12-slim

RUN apt-get update;
RUN apt-get install -y git;

WORKDIR /var/app/
COPY ./package.json /var/app/package.json
RUN npm install -s
COPY ./ /var/app/
RUN npm run build


CMD npm start
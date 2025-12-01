# https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker

FROM node:12.12.0-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json .

# RUN npm install -g pnpm

RUN npm install -g @angular/cli@8.0.6

RUN npm install -g http-server

USER node

RUN npm install

COPY --chown=node:node . .

EXPOSE 8080

CMD [ "sh", "run.sh" ]
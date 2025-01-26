FROM node:22-alpine
LABEL authors="onok"

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force
ENV NODE_ENV production

COPY server.js server.js
COPY src src
RUN mkdir /notes
ENV NOTE_DIR /notes

EXPOSE 3000
CMD [ "node", "server.js" ]

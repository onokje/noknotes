FROM node:22-alpine as base
LABEL authors="onok"

WORKDIR /usr/src/app

COPY package*.json ./
COPY webpack.config.js ./
COPY src src
COPY dist dist
ENV NODE_ENV development
RUN npm ci && npm run build


FROM node:22-alpine as runtime
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js server.js
COPY --from=base /usr/src/app/dist dist
RUN mkdir /notes
ENV NOTE_DIR /notes

EXPOSE 3000
CMD [ "node", "server.js" ]

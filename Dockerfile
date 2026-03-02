FROM node:24-alpine AS base
LABEL authors="onok"

WORKDIR /usr/src/app

COPY package*.json ./
COPY webpack.config.js ./
COPY src src
COPY dist dist
RUN npm ci && npm run build


FROM node:24-alpine AS runtime
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js server.js
COPY --from=base /usr/src/app/dist dist
RUN mkdir /notes
ENV NODE_ENV=production
ENV NOTE_DIR=/notes

EXPOSE 3000
CMD [ "node", "server.js" ]

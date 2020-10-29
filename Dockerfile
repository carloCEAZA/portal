# docker build -t docker.homejota.net/geoos/portal:latest -t docker.homejota.net/geoos/portal:0.28 .
# docker push docker.homejota.net/geoos/portal:latest

# docker build -t geoos/portal:latest -t geoos/portal:0.18 .
# docker push geoos/portal:latest

FROM node:14-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY . .
CMD ["node", "index"]
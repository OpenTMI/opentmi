FROM node:boron
MAINTAINER Jussi Vatjus-Anttila "jussiva@gmail.com"

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# COPY package.json and package-lock.json
COPY package.json package-lock.json ./

RUN npm install

# Bundle app source
COPY . .

# deploy default-ui
# RUN git clone -b docker https://github.com/OpenTMI/opentmi-default-gui.git app/addons

# Use production as default node environment
# to change this use '--build-arg NODE_ENV=development' when building docker
ARG PORT=8000

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

EXPOSE $PORT
CMD [ "npm", "start", "--", "-v", "--listen", "0.0.0.0", "--port", "$PORT"]

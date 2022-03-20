# ---- Base Node ----
FROM node:14-stretch AS base

# ---- Dependencies ----
FROM base AS dependencies
WORKDIR /app
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
# install app dependencies including 'devDependencies'
RUN npm install --only=production
#RUN npm run test

# ---- Copy Files/Build ----
FROM dependencies AS build
WORKDIR /app
COPY app ./app

## ---- UI ----
FROM base AS ui
WORKDIR /app
RUN git clone --depth=1 https://github.com/OpenTMI/opentmi-default-gui.git .
RUN npm ci
RUN NODE_ENV=production npm run build:prod

RUN rm -r node_modules

# --- Release with Alpine ----
FROM node:14-alpine AS release
WORKDIR /app
RUN apk add --no-cache git
# copy package.json
COPY --from=dependencies /app/package.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application and UI
COPY --from=build /app/app ./app
COPY --from=ui /app /app/node_modules/opentmi-default-gui

EXPOSE 8000
CMD ["npm", "start", "--", "-vvv", "--listen", "0.0.0.0", "--port", "8000"]

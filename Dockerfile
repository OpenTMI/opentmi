# ---- Base Node ----
FROM node:12-alpine AS base
# Create app directory
WORKDIR /app

# ---- Dependencies ----
FROM base AS dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
# install app dependencies including 'devDependencies'
RUN npm install

# ---- Copy Files/Build ----
FROM dependencies AS build
WORKDIR /app
COPY app /app
# Build react/vue/angular bundle static files
# RUN npm run build

# --- Release with Alpine ----
FROM node:12-alpine AS release
# Create app directory
WORKDIR /app
# optional
# RUN npm -g install serve
COPY --from=dependencies /app/package.json ./
# Install app dependencies
RUN npm install --only=production
COPY --from=build /app ./
COPY package.json /

CMD ["node", ".", "-vvv", "--port", "8000"]

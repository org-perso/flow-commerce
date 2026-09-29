FROM node:24-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN yarn build && yarn install --frozen-lockfile --production --ignore-scripts

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY migrations ./migrations
USER node
EXPOSE 8080
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "node_modules/.bin/node-pg-migrate up -m migrations --migration-file-language sql && node dist/server.js"]

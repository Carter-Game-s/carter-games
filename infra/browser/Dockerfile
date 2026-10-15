FROM node:22.23.3-bookworm-slim
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npx playwright install --with-deps chromium
COPY server.ts ./
USER node
EXPOSE 8081
CMD ["node", "--experimental-strip-types", "server.ts"]

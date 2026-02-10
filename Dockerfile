FROM node:18-alpine

WORKDIR /app

# Keep Node 18, but update npm to a patched 10.x to reduce Trivy findings in npm's bundled deps.
RUN npm install -g npm@10.9.4

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]

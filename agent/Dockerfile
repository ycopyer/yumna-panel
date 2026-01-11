FROM node:20-slim

WORKDIR /app

# Agent might need ssh and other tools
RUN apt-get update && apt-get install -y \
    openssh-client \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Agent default port
EXPOSE 4001

CMD ["npm", "start"]

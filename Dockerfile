FROM oven/bun:slim
WORKDIR /home/bun/app
COPY package.json ./
COPY bun.lockb ./
COPY app ./
RUN bun install
CMD bun run index.ts
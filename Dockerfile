ARG BASE_IMAGE="node:16"
FROM ${BASE_IMAGE}

WORKDIR /app

COPY ./package.json package.json
COPY ./yarn.lock yarn.lock
RUN yarn install --check-files

COPY . /app

CMD yarn dev

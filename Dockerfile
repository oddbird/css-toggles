FROM mcr.microsoft.com/playwright:v1.36.2-focal

WORKDIR /app

COPY ./package.json package.json
COPY ./yarn.lock yarn.lock
RUN yarn install --check-files

COPY . /app

CMD yarn dev

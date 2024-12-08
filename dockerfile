ARG DOCUDIGGER_VERSION
FROM satantime/puppeteer-node:20-slim
ARG DOCUDIGGER_VERSION
USER node
WORKDIR /home/node/docudigger

# USER root

RUN mkdir -p data
RUN mkdir -p logs

ENV AMAZON_USERNAME=${AMAZON_USERNAME}
ENV AMAZON_PASSWORD=${AMAZON_PASSWORD}
ENV AMAZON_TLD=${AMAZON_TLD}
ENV AMAZON_YEAR_FILTER=${AMAZON_YEAR_FILTER}
ENV AMAZON_PAGE_FILTER=${AMAZON_PAGE_FILTER}
ENV ONLY_NEW=true
ENV FILE_DESTINATION_FOLDER="data"
ENV FILE_FALLBACK_EXTENSION=".pdf"
ENV DEBUG=${DEBUG}
ENV LOG_PATH="logs"
ENV LOG_LEVEL=${LOG_LEVEL}
ENV RECURRING=true
ENV RECURRING_PATTERN="*/30 * * * *"

ENV DOCUDIGGER_VERSION=${DOCUDIGGER_VERSION}

LABEL org.opencontainers.image.source=https://github.com/Disane87/docudigger
LABEL org.opencontainers.image.description="Website scraper for getting invoices automagically as pdf (useful for taxes or DMS)"
LABEL org.opencontainers.image.licenses="MIT"


ENV NODE_ENV=production
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

COPY ["*.tgz", "./"]

RUN npm install -g concurrently --ignore-scripts
RUN npm install -g @disane-dev/docudigger@${DOCUDIGGER_VERSION} --ignore-scripts
# RUN npm install -g ./disane-dev-docudigger-2.0.6-dev.10.tgz --ignore-scripts
RUN npm install -g puppeteer --production --silent
RUN npx puppeteer browsers install chrome

CMD ["concurrently","docudigger scrape all"]

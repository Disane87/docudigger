FROM ghcr.io/puppeteer/puppeteer:20.7.3
USER node
WORKDIR /home/node/docudigger
# USER root

RUN mkdir -p data 
RUN mkdir -p logs

ENV AMAZON_USERNAME ${AMAZON_USERNAME}
ENV AMAZON_PASSWORD ${AMAZON_PASSWORD}
ENV AMAZON_TLD ${AMAZON_TLD}
ENV AMAZON_YEAR_FILTER ${AMAZON_YEAR_FILTER}
ENV AMAZON_PAGE_FILTER ${AMAZON_PAGE_FILTER}
ENV AMAZON_ONLY_NEW true
ENV FILE_DESTINATION_FOLDER "data"
ENV FILE_FALLBACK_EXTENSION ".pdf"
ENV DEBUG ${DEBUG}
ENV LOG_PATH "./logs"
ENV LOG_LEVEL ${LOG_LEVEL}
ENV RECURRING  true
ENV RECURRING_PATTERN "*/30 * * * *"

ENV NODE_ENV production
ENV NPM_CONFIG_PREFIX /home/node/.npm-global
ENV PATH $PATH:/home/node/.npm-global/bin


RUN npm install -g concurrently --ignore-scripts
RUN npm install -g "@disane-dev/docudigger@v1.0.0-dev.8" --ignore-scripts
RUN npm install -g puppeteer

CMD ["concurrently","docudigger scrape amazon"]
FROM node:slim
WORKDIR /usr/src/app

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV AMAZON_USERNAME = ${AMAZON_USERNAME}
ENV AMAZON_PASSWORD = ${AMAZON_PASSWORD}
ENV AMAZON_TLD = ${AMAZON_TLD}
ENV AMAZON_YEAR_FILTER = ${AMAZON_YEAR_FILTER}
ENV AMAZON_PAGE_FILTER = ${AMAZON_PAGE_FILTER}
ENV AMAZON_ONLY_NEW = ${AMAZON_ONLY_NEW}
ENV FILE_DESTINATION_FOLDER = "./data/"
ENV FILE_FALLBACK_EXTENSION = ".pdf"
ENV DEBUG = ${AMAZON_PASSWORD}
ENV LOG_PATH = ${LOG_PATH}
ENV LOG_LEVEL = ${LOG_LEVEL}
ENV RECURRING = ${RECURRING}
ENV RECURRING_PATTERN = ${RECURRING_PATTERN}

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

COPY ./dist .
COPY ./bin ./bin
ENTRYPOINT ["tail"]
CMD ["-f","/dev/null"]
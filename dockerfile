FROM node:slim
WORKDIR /usr/src/app
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install gnupg wget -y && \
    wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install google-chrome-stable -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

ADD ["./dist/deb/docudigger_0.0.0.665c15a-1_amd64.deb", "/usr/src/app/"]
# RUN mkdir -p /usr/src/docudigger
# CMD ["docudigger", "scrape", "all"]
# CMD ["docudigger", "scrape", "all"]
#CMD [sleep, 36000]
ENTRYPOINT ["tail", "-f", "/dev/null"]
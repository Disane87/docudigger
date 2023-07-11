<h1 align="center">Welcome to docudigger 👋</h1>
<p>
  <img alt="npm" src="https://img.shields.io/npm/v/@disane-dev/docudigger/latest">
  <img alt="GitHub package.json dependency version (subfolder of monorepo)" src="https://img.shields.io/github/package-json/dependency-version/Disane87/docudigger/puppeteer">
  

  <img src="https://img.shields.io/badge/npm-%3E%3D9.1.2-blue.svg" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.12.1-blue.svg" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

> Document scraper for getting invoices automagically as pdf (useful for taxes or DMS)

### 🏠 [Homepage](https://repo.disane.dev/Disane/docudigger#readme)

## Prerequisites

- npm >=9.1.2
- node >=18.12.1


## Configuration
All settings can be changed via `CLI`, env variable (even when using docker).


| Setting  |  Description  | Default value  |
|---|---|---|
| AMAZON_USERNAME  | Your Amazon username  | `null`  |
| AMAZON_PASSWORD  | Your amazon password  | `null`  |
| AMAZON_TLD  |  Amazon top level domain  | `de`  |
| AMAZON_YEAR_FILTER  | Only extracts invoices from this year (i.e. 2023)  | `2023` |
| AMAZON_PAGE_FILTER  | Only extracts invoices from this page (i.e. 2)  | `null`  |
| ONLY_NEW  | Tracks already scraped documents and starts a new run at the last scraped one  | `true`  |
| FILE_DESTINATION_FOLDER  | Destination path for all scraped documents  | `./documents/` |
| FILE_FALLBACK_EXTENSION  | Fallback extension when no extension can be determined  | `.pdf`   |
| DEBUG  | Debug flag (sets the loglevel to DEBUG)  | `false`  |
| SUBFOLDER_FOR_PAGES  | Creates subfolders for every scraped page/plugin  | `false`  |
| LOG_PATH  | Sets the log path   | `./logs/` |
| LOG_LEVEL  | Log level (see https://github.com/winstonjs/winston#logging-levels)  | `info`  |
| RECURRING  | Flag for executing the script periodically. Needs 'RECURRING_PATTERN' to be set. Default `true`when using docker container  | `false`  |
| RECURRING_PATTERN  | Cron pattern to execute periodically. Needs RECURRING to true  | `*/30 * * * *`  |
| TZ  | Timezone used for docker enviroments  | `Europe/Berlin`  |

## Install

```sh
npm install
```
## Usage
<!-- usage -->
```sh-session
$ npm install -g @disane-dev/docudigger
$ docudigger COMMAND
running command...
$ docudigger (--version)
@disane-dev/docudigger/2.0.0-dev.2 linux-x64 node-v18.16.1
$ docudigger --help [COMMAND]
USAGE
  $ docudigger COMMAND
...
```
<!-- usagestop -->

## `docudigger scrape all`

Scrapes all websites periodically (default for docker environment)

```
USAGE
  $ docudigger scrape all [--json] [--logLevel trace|debug|info|warn|error] [-d] [-l <value>] [-c <value> -r]

FLAGS
  -c, --recurringCron=<value>  [default: * * * * *] Cron pattern to execute periodically
  -d, --debug
  -l, --logPath=<value>        [default: ./logs/] Log path
  -r, --recurring
  --logLevel=<option>          [default: info] Specify level for logging.
                               <options: trace|debug|info|warn|error>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Scrapes all websites periodically

EXAMPLES
  $ docudigger scrape all
```


## `docudigger scrape amazon`

Used to get invoices from amazon

```
USAGE
  $ docudigger scrape amazon -u <value> -p <value> [--json] [--logLevel trace|debug|info|warn|error] [-d] [-l
    <value>] [-c <value> -r] [--fileDestinationFolder <value>] [--fileFallbackExentension <value>] [-t <value>]
    [--yearFilter <value>] [--pageFilter <value>] [--onlyNew]

FLAGS
  -c, --recurringCron=<value>        [default: * * * * *] Cron pattern to execute periodically
  -d, --debug
  -l, --logPath=<value>              [default: ./logs/] Log path
  -p, --password=<value>             (required) Password
  -r, --recurring
  -t, --tld=<value>                  [default: de] Amazon top level domain
  -u, --username=<value>             (required) Username
  --fileDestinationFolder=<value>    [default: ./data/] Amazon top level domain
  --fileFallbackExentension=<value>  [default: .pdf] Amazon top level domain
  --logLevel=<option>                [default: info] Specify level for logging.
                                     <options: trace|debug|info|warn|error>
  --onlyNew                          Gets only new invoices
  --pageFilter=<value>               Filters a page
  --yearFilter=<value>               Filters a year

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Used to get invoices from amazon

  Scrapes amazon invoices

EXAMPLES
  $ docudigger scrape amazon
```

## Docker
```sh
docker run \ 
  -e AMAZON_USERNAME='[YOUR MAIL]' \ 
  -e AMAZON_PASSWORD='[YOUR PW]' \
  -e AMAZON_TLD='de' \ 
  -e AMAZON_YEAR_FILTER='2020' \
  -e AMAZON_PAGE_FILTER='1' \
  -e LOG_LEVEL='info' \
  -v "C:/temp/docudigger/:/home/node/docudigger" \
  ghcr.io/disane87/docudigger
```

## Dev-Time 🪲
### NPM
```npm
npm install
[Change created .env for your needs]
npm run start
```

## Author

👤 **Marco Franke**

* Website: http://byte-style.de
* Github: [@Disane87](https://github.com/Disane87)
* LinkedIn: [@marco-franke-799399136](https://linkedin.com/in/marco-franke-799399136)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://repo.disane.dev/Disane/docudigger/issues). You can also take a look at the [contributing guide](https://repo.disane.dev/Disane/docudigger/blob/master/CONTRIBUTING.md).

## Show your support

Give a ⭐️ if this project helped you!

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_

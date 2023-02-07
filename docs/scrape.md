`document-scraper scrape`
=========================

Say hello to the world and others

* [`document-scraper scrape`](#document-scraper-scrape)
* [`document-scraper scrape amazon`](#document-scraper-scrape-amazon)

## `document-scraper scrape`

Scrapes your documents with a given plugin

```
USAGE
  $ document-scraper scrape [-n <value>] [-f]

FLAGS
  -f, --force
  -n, --name=<value>  name to print

DESCRIPTION
  Scrapes your documents with a given plugin

EXAMPLES
  $ document-scraper scrape
```

_See code: [dist/commands/scrape/index.ts](https://github.com/Disane87/document-scraper/blob/v0.0.0/dist/commands/scrape/index.ts)_

## `document-scraper scrape amazon`

Scrapes amazon invoices

```
USAGE
  $ document-scraper scrape amazon -u <value> -p <value> [-l <value>] [-l <value>] [--fileDestinationFolder
    <value>] [--fileFallbackExentension <value>] [-t <value>] [--yearFilter <value>] [--pageFilter <value>] [-d]

FLAGS
  -d, --debug
  -l, --logLevel=<value>             [default: info] Log level
  -l, --logPath=<value>              [default: ./logs/] Log path
  -p, --password=<value>             (required) Username
  -t, --tld=<value>                  [default: de] Amazon top level domain
  -u, --username=<value>             (required) Username
  --fileDestinationFolder=<value>    [default: ./data/] Amazon top level domain
  --fileFallbackExentension=<value>  [default: .pdf] Amazon top level domain
  --pageFilter=<value>               Filters a page
  --yearFilter=<value>               Filters a year

DESCRIPTION
  Scrapes amazon invoices

EXAMPLES
  $ document-scraper scrape amazon
```

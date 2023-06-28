<h1 align="center">Welcome to docudigger 👋</h1>
<p>
  <img alt="npm (custom registry)" src="https://img.shields.io/npm/v/@disane-dev/amazon-invoice-scraper/latest?registry_uri=https%3A%2F%2Fnpm.disane.dev">
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
@disane-dev/docudigger/1.0.0-dev.11 win32-x64 node-v18.16.0
$ docudigger --help [COMMAND]
USAGE
  $ docudigger COMMAND
...
```
<!-- usagestop -->

### Commands
<!-- commands -->
* [`docudigger commands`](#docudigger-commands)
* [`docudigger help [COMMAND]`](#docudigger-help-command)
* [`docudigger plugins`](#docudigger-plugins)
* [`docudigger plugins:install PLUGIN...`](#docudigger-pluginsinstall-plugin)
* [`docudigger plugins:inspect PLUGIN...`](#docudigger-pluginsinspect-plugin)
* [`docudigger plugins:install PLUGIN...`](#docudigger-pluginsinstall-plugin-1)
* [`docudigger plugins:link PLUGIN`](#docudigger-pluginslink-plugin)
* [`docudigger plugins:uninstall PLUGIN...`](#docudigger-pluginsuninstall-plugin)
* [`docudigger plugins:uninstall PLUGIN...`](#docudigger-pluginsuninstall-plugin-1)
* [`docudigger plugins:uninstall PLUGIN...`](#docudigger-pluginsuninstall-plugin-2)
* [`docudigger plugins update`](#docudigger-plugins-update)
* [`docudigger scrape all`](#docudigger-scrape-all)
* [`docudigger scrape amazon`](#docudigger-scrape-amazon)

## `docudigger commands`

list all the commands

```
USAGE
  $ docudigger commands [--json] [-h] [--hidden] [--tree] [--columns <value> | -x] [--sort <value>] [--filter
    <value>] [--output csv|json|yaml |  | [--csv | --no-truncate]] [--no-header | ]

FLAGS
  -h, --help         Show CLI help.
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --csv              output is csv format [alias: --output=csv]
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --hidden           show hidden commands
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --sort=<value>     property to sort by (prepend '-' for descending)
  --tree             show tree of commands

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  list all the commands
```

_See code: [@oclif/plugin-commands](https://github.com/oclif/plugin-commands/blob/v2.2.16/src/commands/commands.ts)_

## `docudigger help [COMMAND]`

Display help for docudigger.

```
USAGE
  $ docudigger help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for docudigger.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.19/src/commands/help.ts)_

## `docudigger plugins`

List installed plugins.

```
USAGE
  $ docudigger plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ docudigger plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.1.5/src/commands/plugins/index.ts)_

## `docudigger plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ docudigger plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ docudigger plugins add

EXAMPLES
  $ docudigger plugins:install myplugin 

  $ docudigger plugins:install https://github.com/someuser/someplugin

  $ docudigger plugins:install someuser/someplugin
```

## `docudigger plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ docudigger plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ docudigger plugins:inspect myplugin
```

## `docudigger plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ docudigger plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ docudigger plugins add

EXAMPLES
  $ docudigger plugins:install myplugin 

  $ docudigger plugins:install https://github.com/someuser/someplugin

  $ docudigger plugins:install someuser/someplugin
```

## `docudigger plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ docudigger plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ docudigger plugins:link myplugin
```

## `docudigger plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ docudigger plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ docudigger plugins unlink
  $ docudigger plugins remove
```

## `docudigger plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ docudigger plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ docudigger plugins unlink
  $ docudigger plugins remove
```

## `docudigger plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ docudigger plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ docudigger plugins unlink
  $ docudigger plugins remove
```

## `docudigger plugins update`

Update installed plugins.

```
USAGE
  $ docudigger plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

## `docudigger scrape all`

Scrapes all websites periodically

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
<!-- commandsstop -->
### NPM
```npm
npm run start
```

### Console
```sh
./bin/dev --help
```

### as CLI (when installed from npm)
```sh
npx docudigger --help
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

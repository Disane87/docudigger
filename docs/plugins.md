`document-scraper plugins`
==========================

List installed plugins.

* [`document-scraper plugins`](#document-scraper-plugins)
* [`document-scraper plugins:install PLUGIN...`](#document-scraper-pluginsinstall-plugin)
* [`document-scraper plugins:inspect PLUGIN...`](#document-scraper-pluginsinspect-plugin)
* [`document-scraper plugins:install PLUGIN...`](#document-scraper-pluginsinstall-plugin-1)
* [`document-scraper plugins:link PLUGIN`](#document-scraper-pluginslink-plugin)
* [`document-scraper plugins:uninstall PLUGIN...`](#document-scraper-pluginsuninstall-plugin)
* [`document-scraper plugins:uninstall PLUGIN...`](#document-scraper-pluginsuninstall-plugin-1)
* [`document-scraper plugins:uninstall PLUGIN...`](#document-scraper-pluginsuninstall-plugin-2)
* [`document-scraper plugins update`](#document-scraper-plugins-update)

## `document-scraper plugins`

List installed plugins.

```
USAGE
  $ document-scraper plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ document-scraper plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.7/src/commands/plugins/index.ts)_

## `document-scraper plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ document-scraper plugins:install PLUGIN...

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
  $ document-scraper plugins add

EXAMPLES
  $ document-scraper plugins:install myplugin 

  $ document-scraper plugins:install https://github.com/someuser/someplugin

  $ document-scraper plugins:install someuser/someplugin
```

## `document-scraper plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ document-scraper plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ document-scraper plugins:inspect myplugin
```

## `document-scraper plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ document-scraper plugins:install PLUGIN...

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
  $ document-scraper plugins add

EXAMPLES
  $ document-scraper plugins:install myplugin 

  $ document-scraper plugins:install https://github.com/someuser/someplugin

  $ document-scraper plugins:install someuser/someplugin
```

## `document-scraper plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ document-scraper plugins:link PLUGIN

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
  $ document-scraper plugins:link myplugin
```

## `document-scraper plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ document-scraper plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ document-scraper plugins unlink
  $ document-scraper plugins remove
```

## `document-scraper plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ document-scraper plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ document-scraper plugins unlink
  $ document-scraper plugins remove
```

## `document-scraper plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ document-scraper plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ document-scraper plugins unlink
  $ document-scraper plugins remove
```

## `document-scraper plugins update`

Update installed plugins.

```
USAGE
  $ document-scraper plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

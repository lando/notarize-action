## v2.0.2 - [June 17, 2023](https://github.com/lando/notarize-action/releases/tag/v2.0.2)

* Switched release flow over to [@lando/prepare-release-action](https://github.com/lando/prepare-release-action)

## v2.0.1 - [April 27, 2023](https://github.com/lando/notarize-action/releases/tag/v2.0.1)

* Added guard around unsupported `tool`s
* Fixed bug causing no default `tool` to be set

## v2.0.0 - [April 27, 2023](https://github.com/lando/notarize-action/releases/tag/v2.0.0)

* Added support for both `altool` and `notarytool`
* Switched `set-output` and `save-state` to new `$GITHUB_OUTPUT` and `$GITHUB_STATE`. See [this](https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/)
* Switched default tool to `notarytool`
* Updated all core `actions` to use `v3` if possible

> **NOTE:** Originally forked from https://github.com/devbotsxyz/xcode-notarize

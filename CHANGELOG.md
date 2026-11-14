## Unreleased

* Updated the action runner from Node.js 16 to Node.js 20 and raised the local Node.js minimum to 18.
* Regenerated the committed action bundle from the production lockfile, including `@actions/core` 1.11.1 and `cross-spawn` 7.0.6. The bundle no longer includes the old core dependency on `uuid`.
* Fixed invalid unquoted negation expressions that prevented the test workflow from starting.
* Added credential-free source and standalone-bundle tests to pull requests and main-branch pushes; real Apple signing/notarization is now an explicit, opt-in manual integration check.
* Replaced the obsolete Node.js 16 `pkg` test executable with a small native C fixture and removed the unused packager dependency.
* Refreshed CI helper action runtimes and corrected the project-label condition.

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

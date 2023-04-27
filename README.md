# Notarize Action

This action Apple notarizes macOS applications or plug-ins. It does this by submitting your built `.app` (or non-app bundle) to Apple's notarization service. It will poll the notarization service until it times out of receives a success response.

It was originally adapted from https://github.com/devbotsxyz/xcode-notarize

> Notarization is a complicated process, but the gist of it is this: if you want to distribute your macOS application outside of the Mac App Store, you need to Sign and Notarize your application. This Action only needs two inputs for that: the `product-path` that points your application and your AppStore Connect credentials with `appstore-connect-username` / `appstore-connect-password`. (This need to be an _App Specific Password_ as regular accounts require 2FA)

## Required Inputs

These keys must be set correctly for the action to work.

| Name | Description | Example Value |
|---|---|---|
| `product-path` | The path to the product to notarize.  | `/dist/MyApp.app` |
| `appstore-connect-username` | The AppStore Connect username. | `${{ secrets.NOTARIZATION_USERNAME }}` |
| `appstore-connect-password` | The AppStore Connect password. | `${{ secrets.NOTARIZATION_PASSWORD }}` |
| `appstore-connect-team-id` | The AppStore Connect team id. Only required when using `notarytool`. | FY8GAUX283 |

## Optional Inputs

These keys are set to sane defaults but can be modified as needed.

| Name | Description | Default | Example |
|---|---|---|---|
| `appstore-connect-api-key` | The AppStore Connect API Key. | `null` | `${{ secrets.NOTARIZATION_API_KEY }}` |
| `appstore-connect-api-issuer` | The AppStore Connect API Issuer. | `null` | `${{ secrets.NOTARIZATION_API_ISSUER }}` |
| `primary-bundle-id` | A unique identifier that identifies this product notarization. | bundle identifier of the app you are uploading. | `dev.lando.my-app |
| `tool` | The `xcrun` notarization tool to use. | `notarytool` | `altool` |
| `verbose` | Verbose mode will print Notarization API responses. | `false` | `true` |

##  Usage

### Basic Usage

```yaml
- name: Notarize Release Build
  uses: lando/notarize-action@v2
  with:
    product-path: "/dist/MyApp.app"
    appstore-connect-username: ${{ secrets.NOTARIZATION_USERNAME }}
    appstore-connect-password: ${{ secrets.NOTARIZATION_PASSWORD }}
```

Note that notarization is not the final step. After Apple has notarized your application, you also want to _staple_ a notarization ticket to your product.

This can be done with the [Xcode Staple](https://github.com/marketplace/actions/xcode-staple) action.

## Changelog

We try to log all changes big and small in both [THE CHANGELOG](https://github.com/lando/notarize-action/blob/main/CHANGELOG.md) and the [release notes](https://github.com/lando/notarize-action/releases).

## Releasing

1. Correctly compile, bump versions, tag things and push to GitHub

  ```bash
  yarn release
  ```

2. Publish to [GitHub Actions Marketplace](https://docs.github.com/en/enterprise-cloud@latest/actions/creating-actions/publishing-actions-in-github-marketplace)

## Contributors

<a href="https://github.com/lando/notarize-action/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lando/notarize-action" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

## Other Resources

* [Important advice](https://www.youtube.com/watch?v=WA4iX5D9Z64)

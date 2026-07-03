# @sirosfoundation/wallet-companion

## 0.1.0-beta.6

### Patch Changes

- [#95](https://github.com/sirosfoundation/wallet-companion/pull/95) [`bfcc961`](https://github.com/sirosfoundation/wallet-companion/commit/bfcc96107870773dba50236afef80ea5a1dfe837) Thanks [@smncd](https://github.com/smncd)! - rename locale key `extension_name` to `name` to match PR [#94](https://github.com/sirosfoundation/wallet-companion/issues/94).

- [#96](https://github.com/sirosfoundation/wallet-companion/pull/96) [`6e73426`](https://github.com/sirosfoundation/wallet-companion/commit/6e7342644e47c44dbace6af1d3501029fe1d0b15) Thanks [@smncd](https://github.com/smncd)! - fix firefox manifest

## 0.1.0-beta.5

### Minor Changes

- [#83](https://github.com/sirosfoundation/wallet-companion/pull/83) [`5ae7872`](https://github.com/sirosfoundation/wallet-companion/commit/5ae7872d4fe33d2b87bcf408d54ea44be671bb3b) Thanks [@leifj](https://github.com/leifj)! - feat: add i18n support with Swedish and Finnish translations

- [#87](https://github.com/sirosfoundation/wallet-companion/pull/87) [`5186420`](https://github.com/sirosfoundation/wallet-companion/commit/5186420b6de8ce44ac3fd184f11d477087828f8d) Thanks [@smncd](https://github.com/smncd)! - Complete localization in 5 languages

### Patch Changes

- [#89](https://github.com/sirosfoundation/wallet-companion/pull/89) [`3db166e`](https://github.com/sirosfoundation/wallet-companion/commit/3db166e86df06338c09ecd6be54cb6759c2f5c7e) Thanks [@smncd](https://github.com/smncd)! - Set firefox manifest gecko id

- [#90](https://github.com/sirosfoundation/wallet-companion/pull/90) [`5696efe`](https://github.com/sirosfoundation/wallet-companion/commit/5696efea9017efec31979224c13f2612e2dcd1af) Thanks [@smncd](https://github.com/smncd)! - Remove unused permissions from the extension manifest

## 0.1.0-beta.4

### Patch Changes

- [#80](https://github.com/sirosfoundation/wallet-companion/pull/80) [`de3abd9`](https://github.com/sirosfoundation/wallet-companion/commit/de3abd93ac00fa3073cac301e9995b223ce495fa) Thanks [@smncd](https://github.com/smncd)! - Fix modal styles tripping CSP headers

## 0.1.0-beta.3

### Minor Changes

- [#77](https://github.com/sirosfoundation/wallet-companion/pull/77) [`ebda888`](https://github.com/sirosfoundation/wallet-companion/commit/ebda888b617a55927339b92d2fa1c25c49c34178) Thanks [@smncd](https://github.com/smncd)! - Separate package `@sirosfoundation/wcc-types` for client API types

### Patch Changes

- Updated dependencies [[`e0e1f3f`](https://github.com/sirosfoundation/wallet-companion/commit/e0e1f3f90160f4e00f57dbdab84408c0a4fc593e)]:
  - @sirosfoundation/wcc-types@0.1.0-beta.0

## 0.1.0-beta.2

### Minor Changes

- [#75](https://github.com/sirosfoundation/wallet-companion/pull/75) [`c4a3e33`](https://github.com/sirosfoundation/wallet-companion/commit/c4a3e3373012330b674ce61fac259a38578120af) Thanks [@smncd](https://github.com/smncd)! - Remove `emoji` support and `iconType` field

- [#75](https://github.com/sirosfoundation/wallet-companion/pull/75) [`fbb7a40`](https://github.com/sirosfoundation/wallet-companion/commit/fbb7a40935f0b347927f1cb629e8d6bf15eeeac4) Thanks [@smncd](https://github.com/smncd)! - Merge wallet `logo` field with the `icon` field, and ensure there is always a data-uri icon string present

### Patch Changes

- [#73](https://github.com/sirosfoundation/wallet-companion/pull/73) [`866c2a9`](https://github.com/sirosfoundation/wallet-companion/commit/866c2a9d1a39b806a58c178abf2acb8455c72bc6) Thanks [@smncd](https://github.com/smncd)! - Allow wallets to check the request origin

- [#74](https://github.com/sirosfoundation/wallet-companion/pull/74) [`97f0aa2`](https://github.com/sirosfoundation/wallet-companion/commit/97f0aa24fecddf15a792f507b905c95624301d81) Thanks [@smncd](https://github.com/smncd)! - Add support for `transaction_data` parameter

## 0.1.0-beta.1

### Patch Changes

- [#71](https://github.com/sirosfoundation/wallet-companion/pull/71) [`8dfc2f1`](https://github.com/sirosfoundation/wallet-companion/commit/8dfc2f1ce796a7d15f658eb1c03c27665fae77d6) Thanks [@smncd](https://github.com/smncd)! - strip version prefix from manifest version entry

## 0.1.0-beta.0

### Minor Changes

- [#45](https://github.com/sirosfoundation/wallet-companion/pull/45) [`8b321a6`](https://github.com/sirosfoundation/wallet-companion/commit/8b321a626e448fffb0ec4bfb65d538f03bfba318) Thanks [@smncd](https://github.com/smncd)! - All browsers now use MV3

### Patch Changes

- [#58](https://github.com/sirosfoundation/wallet-companion/pull/58) [`7e51eaa`](https://github.com/sirosfoundation/wallet-companion/commit/7e51eaa52909513f86b162bb78163a6a1c1d5e95) Thanks [@smncd](https://github.com/smncd)! - use `@sirosfoundation/browser-log` for logging

- [#63](https://github.com/sirosfoundation/wallet-companion/pull/63) [`71eb64d`](https://github.com/sirosfoundation/wallet-companion/commit/71eb64d7855322276b3ee58302c73439a7137df9) Thanks [@smncd](https://github.com/smncd)! - Make dist dir file structure flat

- [#65](https://github.com/sirosfoundation/wallet-companion/pull/65) [`15b0928`](https://github.com/sirosfoundation/wallet-companion/commit/15b0928ca96746690323ce23e32f3a2553dd0825) Thanks [@smncd](https://github.com/smncd)! - JAR support in DCGateway

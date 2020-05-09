# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.4](https://github.com/duartemendes/aws-sam-api-proxy/compare/v0.0.3...v0.0.4) (2020-05-09)

### [0.0.3](https://github.com/duartemendes/aws-sam-api-proxy/compare/v0.0.2...v0.0.3) (2020-05-07)

### [0.0.2](https://github.com/duartemendes/aws-sam-api-proxy/compare/v0.0.1...v0.0.2) (2020-05-07)


### Features

* **cli:** make env vars optional ([99927fd](https://github.com/duartemendes/aws-sam-api-proxy/commit/99927fd9d9bcd8180c5937df7114ebaca4fd6252))
* make docker network optional; depend on config over process.env ([31997c9](https://github.com/duartemendes/aws-sam-api-proxy/commit/31997c9d8446a0fdada3b9c696e5f9e3a0922a34))
* **cli:** set default for template ([bd926da](https://github.com/duartemendes/aws-sam-api-proxy/commit/bd926dac386b20b7d2a555171ebf34b0bdf2f8e2))
* fallback to globals, ask for base path over 3 full paths ([fcf64e6](https://github.com/duartemendes/aws-sam-api-proxy/commit/fcf64e6ca7c946661db04ffbcf462813fdcc997d))
* log upstream response status code ([6a0b6a0](https://github.com/duartemendes/aws-sam-api-proxy/commit/6a0b6a0810af79407fa8944bd7381b8057e4c33a))
* read env vars dinamically from env variable ([f58f53b](https://github.com/duartemendes/aws-sam-api-proxy/commit/f58f53be635dea065dfb61f9d6e52576ee41a7cb))
* setup cli ([8bc1d69](https://github.com/duartemendes/aws-sam-api-proxy/commit/8bc1d698d07f82038748006e9dfff89ad707322e))


### Bug Fixes

* fix gitignore and commit necessary test fixtures ([7bc1b94](https://github.com/duartemendes/aws-sam-api-proxy/commit/7bc1b944df0d37f9176c29b3003ad173468bfbba))
* fix package description ([7df7ff1](https://github.com/duartemendes/aws-sam-api-proxy/commit/7df7ff1be32caf003dfdcbc6b82ade901dab1f54))
* handle rejected promises; select first event when multiple matched ([41d7b3e](https://github.com/duartemendes/aws-sam-api-proxy/commit/41d7b3eab5e9ecddc9a636618d7bda2f240768d7))

### 0.0.1 (2020-05-03)


### Features

* build event according to event type and payloadformatversion 405210d
* Initial commit 8b07722
* kill api containers on start 1ea7a7a
* match incoming request with function to trigger; proxy dummy request 67fef75
* Spin up lambda containers 3ec92be
* support all runtimes and pull required docker images on start 8a14ba1


### Bug Fixes

* avoid pulling same image tag multiple times ee681b0
* read functions from template instead of envvars 7f2307d
* Remove unnecessary imports 421ba8a

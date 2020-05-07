# aws-sam-api-proxy

## The problem

## Motivation

## CLI

### Install

```bash
npm i aws-sam-api-proxy -g
```

### Start API

```bash
sam-proxy start my-api --port 3000 --template ./template.yaml --dist-path ./dist --env-vars ./fixtures/envVars.json --docker-network my_network
```

### Tearing down the house

#### For a specific API

```bash
sam-proxy teardown my-api
```

#### For all APIs

```bash
sam-proxy teardown-all
```

### More

```bash
sam-proxy --help
```

## Working example

## Under the hood

## Roadmap

- Write README
- Publish alpha version to NPM
- Push to GitHub
- ...RELEASE DONE...
- Setup CI/CD
- Refactor buildContainerOptions.js to serverlessFunctions folder
- Support JSON template
- Log levels
- Lambda timeouts
- Lambda memory size
- Fill events missing data:
  - requestContext
  - multiValueHeaders
  - multiValueQueryStringParameters
  - cookies
  - stageVariables

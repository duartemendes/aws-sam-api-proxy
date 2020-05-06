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

### Cleaning up the house

#### For a specific API

```bash
sam-proxy cleanup my-api
```

#### For all APIs

```bash
sam-proxy cleanup-all
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

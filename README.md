# aws-sam-api-proxy

## Usage

## Roadmap

- All the TODOs...
- Fill event requestContext data
- Fill event multiValueHeaders and multiValueQueryStringParameters data
- Fill event cookies data
- Fill event stageVariables data

## TODO

- Setup CLI
- Export methods to clean up the house on CLI
- Setup CI/CD
- Write DOCS
  - Working example
  - What's missing

## Cleaning up the house

### For a specific api

```bash
docker rm -f $(docker ps -a -f label=aws-sam-api-proxy.api=api-name -q)
```

### For all apis

```bash
docker rm -f $(docker ps -a -f label=aws-sam-api-proxy.api -q)
```

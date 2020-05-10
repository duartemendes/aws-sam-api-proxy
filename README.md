# aws-sam-api-proxy 🚀

User and advocate of [SAM](https://github.com/awslabs/serverless-application-model)? Improve development of API based Lambdas.

Execute your HTTP requests locally without hitting **cold starts** every time!

It's like running `sam local start-api` but keeping the containers (functions) around.

This tool will spin up a local server and proxy any incoming request to the expected lambda, [here's how](#under-the-hood).

## Features

- No cold starts on every request
  - in the first invocation a cold start is experienced, just like in the AWS environment
  - subsequent invocations are as fast as your code! 🏃‍♂️
- Context reutilization
- Always watching your distribution folder - rebuild your code and changes are propagated immediately
- Automatic discoverability of your Lambda functions
  - Global CodeUri, Runtime and Handlers are supported
  - Environment variables are passed through and can be overridden with `--env-vars`
  - All runtimes are supported
- Path parameters, querystring, body and headers are all passed through the request, with no changes
- Already supports Http Apis

## Motivation

Developing AWS Lambdas and API Gateways locally is not usually the best experience.

I tend to develop with the help of unit tests but it just isn't enough. I always feel the need to make HTTP requests to properly test my template and code.

When I use `sam local invoke` or `sam local start-api`, even with the `--skip-pull-image` option, the cold starts on every request kills my mood and slows me down.

Another issue me and my team face, is that our APIs are behind a GraqhQL server. A query that should take less than a second to fulfil, takes about 6 to 7 seconds 🤨🔫

With this tool all this pain went away and I'm able to test my APIs much faster 😍

I hope somehow this tool is of any help to you. If you find a bug just open an issue or go ahead and fix it.

For more context you can read through [aws-sam-cli/issues/239](https://github.com/awslabs/aws-sam-cli/issues/239) and understand what led me to write this tool.

## Requirements

The only dependency to use this CLI is docker. Make sure it's running.

## CLI

### Install

```bash
npm i aws-sam-api-proxy -g
```

### Start API

Nice and easy:

```bash
cd ~/my-api
sam-proxy start my-api --port 3000
```

Or, with all the options available:

```bash
sam-proxy start my-api --port 3000 --base-path ~/my-api --template template.yaml --env-vars envVars.json --docker-network my_network
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

### Running multiple APIs

If you want to **run multiple APIs**, the only detail to take in consideration is the port you choose to run your server on.

Why? All containers created by this tool will expose a port that is based on the server port.

Example:

Imagine your API has 4 endpoints and your server is running at port 3000.

4 containers are running, the following ports are being used: 3001, 3002, 3003 and 3004.

What you need to do, on the subsequent server, is to select an higher port. For this example, 3005 would be enough.

## Template sample

My templates usually look something like this:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Resources API
Transform: AWS::Serverless-2016-10-31

Parameters:
  Env:
    Type: String
    AllowedValues:
      - dev
      - stg
      - prd

Globals:
  Function:
    Runtime: nodejs12.x
    MemorySize: 256
    Timeout: 10
    Environment:
      Variables:
        NODE_ENV: !Ref Env

Resources:
  GetResources:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./dist
      Handler: GetResourcesHandler.default
      Events:
        GetResourcesEvent:
          Type: Api
          Properties:
            Path: /resources
            Method: GET
```

## Under the hood

Very succinctly, this tool does the following:

1. Parse your SAM template and your environment variables file if provided
2. Filter all functions triggered by Api or HttpApi events
3. Remove containers running for this API
4. Pull necessary docker images
5. Create and start containers for each Lambda function with the given environment variables
6. Spins up a server that acts as an API Gateway, proxying incoming requests to the expected containers

Keeping containers warm is possible due to the environment variable [DOCKER_LAMBDA_STAY_OPEN](https://github.com/lambci/docker-lambda#running-in-stay-open-api-mode) that is given to the container on creation.

## Logs

This tool will automatically log request details, duration and response status code.

If you want to check the logs of a function, just take a look at the container logs:

```bash
docker ps
docker logs get_resources_lambda
```

## Credits

This tool wouldn't be possible without [lambci/docker-lambda](https://github.com/lambci/docker-lambda) or [dockerode](https://github.com/apocas/dockerode). Thank you 🍻.

## Roadmap

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

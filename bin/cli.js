#!/usr/bin/env node

import { program } from 'commander';
import Docker from 'dockerode';
import { version } from '../package.json';
import { createDockerService } from '../dist/docker';
import startApi from '../dist';

program.version(version);

program
  .command('start <apiName>')
  .description('start an api')
  .requiredOption('-p, --port <port>', 'The port the server will run on')
  .option('-n, --env-vars <envVars>', 'JSON file containing values for Lambda function\'s environment variables.')
  .option('-t, --template <template>', 'Relative path to the SAM template', 'template.yaml')
  .option('--docker-network <dockerNetwork>', 'The docker network you want your containers to connect to')
  .option('--base-path <basePath>', 'The base path of the API', process.cwd())
  .option('--ref-overrides <refOverrides>', 'Comma-separated key=value pairs to use when resolving Ref calls in your function environments')
  .option('--port-increment <portIncrement>', 'The increment value for ports that containers will use', '1')
  .option('--log-level <logLevel>', 'The log level to use (trace, debug, info, warn, error)', 'debug')
  .option('--base-image-repo <baseRepo>', 'Repository to pull base container image(eg. public.ecr.aws/p0o6c8z6/lambda), defaults to lambci/lambda from system default (usually docker.io)', 'lambci/lambda')
  .option('--skip-pull-images', 'Optionally skip to pull base image')
  .option('-aws, --aws-credentials-folder <awsCredentialsFolder>', 'Absolute path to your local aws credentials folder. (i.e. \'/Users/john/.aws\')')
  .option('--docker-socket-path <dockerSocketPath>', 'Daemon docker option.', '/var/run/docker.sock')
  .action(async (apiName, options) => {
    const {
      port,
      template,
      envVars,
      basePath,
      dockerNetwork,
      refOverrides,
      portIncrement,
      logLevel,
      baseImageRepo,
      skipPullImages,
      awsCredentialsFolder,
      dockerSocketPath,
    } = options;

    const dockerService = createDockerService(new Docker({ socketPath: dockerSocketPath }));

    await dockerService.validateDockerStatus();

    const params = {
      apiName,
      port: Number(port),
      template,
      envVars,
      basePath,
      dockerNetwork,
      refOverrides,
      portIncrement: Number(portIncrement),
      logLevel,
      baseImageRepo,
      skipPullImages,
      awsCredentialsFolder,
    };

    await startApi(dockerService, params);
  });

program
  .command('teardown <apiName>')
  .description('Remove api leftovers - i.e. docker containers created by this tool (identifiable by a label)')
  .option('--docker-socket-path <dockerSocketPath>', 'Daemon docker option. Defaults to /var/run/docker.sock', '/var/run/docker.sock')
  .action(async (apiName, options) => {
    const { dockerSocketPath } = options;

    const dockerService = createDockerService(new Docker({ socketPath: dockerSocketPath }));

    await dockerService.validateDockerStatus();
    console.log(`Cleaning up all containers created by this tool for api "${apiName}"`);
    await dockerService.removeApiContainers(apiName);
    console.log('All containers have been removed.');
  });

program
  .command('teardown-all')
  .description('Remove all api leftovers - i.e. docker containers created by this tool (identifiable by a label)')
  .option('--docker-socket-path <dockerSocketPath>', 'Daemon docker option. Defaults to /var/run/docker.sock', '/var/run/docker.sock')
  .action(async (options) => {
    const { dockerSocketPath } = options;

    const dockerService = createDockerService(new Docker({ socketPath: dockerSocketPath }));

    await dockerService.validateDockerStatus();
    console.log('Cleaning up all containers created by this tool');
    await dockerService.removeAllContainers();
    console.log('All containers have been removed.');
  });

program.parse(process.argv);

process.on('unhandledRejection', (error) => {
  console.log(error);
});

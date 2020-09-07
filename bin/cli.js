#!/usr/bin/env node

import { program } from 'commander';
import Docker from 'dockerode';
import { version } from '../package.json';
import { createDockerService } from '../dist/docker';
import startApi from '../dist';

const dockerService = createDockerService(new Docker());

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
  .action(async (apiName, options) => {
    await dockerService.validateDockerStatus();

    const {
      port,
      template,
      envVars,
      basePath,
      dockerNetwork,
      refOverrides,
    } = options;

    const params = {
      apiName,
      port: Number(port),
      template,
      envVars,
      basePath,
      dockerNetwork,
      refOverrides,
    };

    await startApi(dockerService, params);
  });

program
  .command('teardown <apiName>')
  .description('Remove api leftovers - i.e. docker containers created by this tool (identifiable by a label)')
  .action(async (apiName) => {
    await dockerService.validateDockerStatus();
    console.log(`Cleaning up all containers created by this tool for api "${apiName}"`);
    await dockerService.removeApiContainers(apiName);
    console.log('All containers have been removed.');
  });

program
  .command('teardown-all')
  .description('Remove all api leftovers - i.e. docker containers created by this tool (identifiable by a label)')
  .action(async () => {
    await dockerService.validateDockerStatus();
    console.log('Cleaning up all containers created by this tool');
    await dockerService.removeAllContainers();
    console.log('All containers have been removed.');
  });

program.parse(process.argv);

process.on('unhandledRejection', (error) => {
  console.log(error);
});

#!/usr/bin/env node

const { program } = require('commander');
const Docker = require('dockerode');
const { version } = require('../package.json');
const createDockerService = require('../dist/dockerService').default;
const startApi = require('../dist').default;

const dockerService = createDockerService(new Docker());

program.version(version);

program
  .command('start <apiName>')
  .description('start an api')
  .requiredOption('-p, --port <port>', 'The port the server will run on')
  .requiredOption('-n, --env-vars <envVars>', 'JSON file containing values for Lambda function\'s environment variables.')
  .requiredOption('--docker-network <dockerNetwork>', 'The docker network you want your containers to connect to')
  .option('-t, --template <template>', 'Relative path to the SAM template', 'template.yaml')
  .option('--base-path <basePath>', 'The base path of the API', process.cwd())
  .action(async (apiName, options) => {
    await dockerService.validateDockerStatus();

    const {
      port,
      template,
      envVars,
      basePath,
      dockerNetwork,
    } = options;

    const params = {
      apiName,
      port,
      template,
      envVars,
      basePath,
      dockerNetwork,
    };

    await startApi(dockerService, params);
  });

program
  .command('cleanup <apiName>')
  .description('Remove api leftovers - i.e. docker containers created by this tool (identifiable by a label)')
  .action(async (apiName) => {
    await dockerService.validateDockerStatus();
    console.log(`Cleaning up all containers created by this tool for api "${apiName}"`);
    await dockerService.removeApiContainers(apiName);
    console.log('All containers have been removed.');
  });

program
  .command('cleanup-all')
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

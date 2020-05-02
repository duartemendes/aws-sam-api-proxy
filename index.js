import http from 'http';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import Docker from 'dockerode';
import envVars from './fixtures/envVars-temp.json';
import createController from './src/controller';
import createDockerService from './src/dockerService';
import { parseFunctionsFromTemplate } from './src/serverlessFunctions';

const PORT = Number(process.env.PORT);

const templateYaml = readFileSync('./fixtures/template.yaml', 'utf-8');
const templateYamlWithoutFns = templateYaml.replace(/!/g, '');
const template = yaml.safeLoad(templateYamlWithoutFns);

const prepareEnvironment = async (dockerService) => {
  await Promise.all([
    dockerService.killOldContainers(),
    dockerService.pullRequiredDockerImages(),
  ]);

  await dockerService.createContainers();
}

const spinUpServer = (functions) => {
  const server = http.createServer();
  const controller = createController(functions);

  server.on('request', controller);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    const endpoints = functions.map(({ method, path }) => ({ method: method.toUpperCase(), path: path.full }));
    console.log('The following endpoints are exposed:');
    console.table(endpoints);
  });
}

async function go() {
  try {
    const docker = new Docker();
    const dockerStatus = await docker.ping();
    if (dockerStatus.toString() !== 'OK') throw new Error('Docker must be running');

    const functions = parseFunctionsFromTemplate(template, envVars, PORT + 1);
    const dockerService = createDockerService(docker, functions);

    await prepareEnvironment(dockerService);

    spinUpServer(functions);
  } catch (err) {
    console.log(err);
  }
}

go();
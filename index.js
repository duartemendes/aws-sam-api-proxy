import { readFile } from 'fs';
import { promisify } from 'util';
import Docker from 'dockerode';
import parseSAMTemplate from './src/parseSAMTemplate';
import createDockerService from './src/dockerService';
import { parseFunctionsFromTemplate } from './src/serverlessFunctions';
import spinUpServer from './src/server';

const encoding = 'utf-8';
const readFileAsync = promisify(readFile);

const getRequiredDependencies = async () => {
  const [envVarsString, templateYaml] = await Promise.all([
    readFileAsync(process.env.ENV_VARS_PATH, encoding),
    readFileAsync(process.env.TEMPLATE_PATH, encoding),
  ]);

  const envVars = JSON.parse(envVarsString);
  const template = await parseSAMTemplate(templateYaml);

  return { envVars, template };
};

const prepareEnvironment = async (dockerService) => {
  await Promise.all([
    dockerService.removeOldContainers(),
    dockerService.pullRequiredDockerImages(),
  ]);

  await dockerService.createContainers();
};

async function go() {
  try {
    const docker = new Docker();
    const dockerStatus = await docker.ping();
    if (dockerStatus.toString() !== 'OK') throw new Error('Docker must be running');

    const { template, envVars } = await getRequiredDependencies();
    const port = Number(process.env.PORT);
    const portOffset = port + 1;
    const functions = parseFunctionsFromTemplate(template, envVars, portOffset);
    const dockerService = createDockerService(docker, functions);

    await prepareEnvironment(dockerService);

    spinUpServer(functions, port);
  } catch (err) {
    console.log(err);
  }
}

go();

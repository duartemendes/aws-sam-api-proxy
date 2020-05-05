import { readFile } from 'fs';
import { promisify } from 'util';
import parseSAMTemplate from './parseSAMTemplate';
import { parseFunctionsFromTemplate } from './serverlessFunctions';
import spinUpServer from './server';

const encoding = 'utf-8';
const readFileAsync = promisify(readFile);

const getRequiredDependencies = async (envVarsPath, templatePath) => {
  const [envVarsString, templateYaml] = await Promise.all([
    readFileAsync(envVarsPath, encoding),
    readFileAsync(templatePath, encoding),
  ]);

  const envVars = JSON.parse(envVarsString);
  const template = await parseSAMTemplate(templateYaml);

  return { envVars, template };
};

const prepareEnvironment = async (dockerService, functions) => {
  await Promise.all([
    dockerService.removeApiContainers(process.env.API_NAME),
    dockerService.pullRequiredDockerImages(functions),
  ]);

  await dockerService.createContainers(functions);
};

export default async (dockerService, options) => {
  const { template, envVars } = await getRequiredDependencies(options.envVars, options.template);

  process.env.API_NAME = options.apiName;
  process.env.DIST_PATH = options.distPath;
  process.env.DOCKER_NETWORK = options.dockerNetwork;

  const port = Number(options.port);
  const portOffset = port + 1;
  const functions = parseFunctionsFromTemplate(template, envVars, portOffset);

  await prepareEnvironment(dockerService, functions);

  spinUpServer(functions, port);
};

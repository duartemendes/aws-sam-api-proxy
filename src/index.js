import path from 'path';
import { readFile } from 'fs';
import { promisify } from 'util';
import parseSAMTemplate from './parseSAMTemplate';
import { parseFunctionsFromTemplate } from './serverlessFunctions';
import spinUpServer from './server';

const encoding = 'utf-8';
const readFileAsync = promisify(readFile);

const getRequiredDependencies = async (options) => {
  const envVarsPath = path.join(options.basePath, options.envVars);
  const templatePath = path.join(options.basePath, options.template);

  const [envVarsString, templateYaml] = await Promise.all([
    readFileAsync(envVarsPath, encoding),
    readFileAsync(templatePath, encoding),
  ]);

  const envVars = JSON.parse(envVarsString);
  const template = await parseSAMTemplate(templateYaml);

  return { envVars, template };
};

export default async (dockerService, options) => {
  const { template, envVars } = await getRequiredDependencies(options);

  const { apiName, basePath, port } = options;
  const portOffset = port + 1;
  const functions = parseFunctionsFromTemplate(template, envVars, portOffset, basePath);

  await Promise.all([
    dockerService.removeApiContainers(apiName),
    dockerService.pullRequiredDockerImages(functions),
  ]);

  await dockerService.createContainers(functions, options);

  spinUpServer(functions, port, apiName);
};

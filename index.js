import http from 'http';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import envVars from './fixtures/envVars.json';

const templateYaml = readFileSync('./fixtures/template.yaml', 'utf-8');
const templateYamlWithoutFns = templateYaml.replace(/!/g, '');
const template = yaml.safeLoad(templateYamlWithoutFns);

const functions = Object.entries(envVars).reduce((result, [functionName, environment]) => {
  const resource = template.Resources[functionName];
  if (!resource) throw new Error(`Function with name "${functionName}" not found in SAM template`);

  const apiEvent = Object.values(resource.Properties.Events).find(({ Type }) => Type.includes('Api'));
  if (!apiEvent) throw new Error(`Api event not found for function with name "${functionName}"`);
  const { Properties: { Path, Method } } = apiEvent;

  return result.concat({
    name: functionName,
    path: Path,
    method: Method,
    environment,
  });
}, []);

const server = http.createServer();

server.on('request', async (req, res) => {
  console.log('Received request');
  res.end(JSON.stringify({ status: 'ok', data: { functions, template } }));
});

server.listen(3000);

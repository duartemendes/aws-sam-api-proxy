import http from 'http';
import { createWriteStream, readFileSync } from 'fs';
import yaml from 'js-yaml';
import Docker, { Image } from 'dockerode';
import snakeCase from 'lodash.snakecase';
import envVars from './fixtures/envVars-temp.json';

const PORT = 3000;
const DOCKER_IMAGE = 'lambci/lambda:nodejs12.x';

const templateYaml = readFileSync('./fixtures/template.yaml', 'utf-8');
const templateYamlWithoutFns = templateYaml.replace(/!/g, '');
const template = yaml.safeLoad(templateYamlWithoutFns);

const isApiEvent = ({ Type }) => Type.includes('Api');
const docker = new Docker();

const parseFunctions = () => Object.entries(envVars).reduce((result, [functionName, environment], i) => {
  const resource = template.Resources[functionName];
  if (!resource) throw new Error(`Function with name "${functionName}" not found in SAM template`);

  const { Events, Handler } = resource.Properties;

  const apiEvent = Object.values(Events).find(isApiEvent);
  if (!apiEvent) throw new Error(`Api event not found for function with name "${functionName}"`);

  const { Type, Properties: { Path, Method } } = apiEvent;

  return result.concat({
    name: functionName,
    handler: Handler,
    eventType: Type,
    path: Path,
    method: Method,
    containerPort: PORT + i + 1,
    environment,
  });
}, []);

const createContainers = async (functions) => {
  const promises = functions.map(async ({ name, environment, containerPort, handler }) => {
    const options = {
      Image: DOCKER_IMAGE,
      name: `${snakeCase(name)}_lambda`,
      Cmd: [handler],
      Env: [
        'DOCKER_LAMBDA_WATCH=1',
        'DOCKER_LAMBDA_STAY_OPEN=1',
        ...Object.entries(environment).map(([key, value]) => `${key}=${value}`)
      ],
      ExposedPorts: {
        '9001/tcp': {}
      },
      Volumes: {
        '/var/task': {}
      },
      HostConfig: {
        Binds: ['/Users/duartemendes/deadhappy/repos/deathwish-api/dist:/var/task:ro,delegated'],
        PortBindings: {
          '9001/tcp': [{ HostPort: `${containerPort}` }]
        },
        NetworkMode: 'deadhappy_network'
      }
    };

    const container = await docker.createContainer(options);
    console.log('Starting container', { id: container.id, name: options.name, exposedPort: containerPort });
    await container.start()
    return container.id;
  });

  return Promise.all(promises);
}

const spinUpServer = (functions) => {
  const server = http.createServer();

  server.on('request', async (req, res) => {
    const { url, method, headers } = req;
    console.log('Received request', { url, method, headers });

    // TODO: pipe request to corresponding container... might need to map querystring, headers, path parameters...

    res.end(JSON.stringify({ status: 'ok', data: { functions } }));
  });

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

async function go() {
  const ping = await docker.ping();
  if (ping.toString() !== 'OK') throw new Error('Docker needs to be running');

  try {
    const functions = parseFunctions();
    const containers = await createContainers(functions);

    spinUpServer(functions);
  } catch (err) {
    console.log(err);
  }
}

go();
import http from 'http';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import Docker from 'dockerode';
import snakeCase from 'lodash.snakecase';
import got from 'got';
import { v4 as uuidv4 } from 'uuid';
import envVars from './fixtures/envVars-temp.json';
import createApiGatewayProxyEvent from './src/apiGatewayProxyEvent';

// CONFIG
const PORT = 3000;
const DOCKER_IMAGE = 'lambci/lambda';
const DOCKER_NETWORK = 'deadhappy_network';
const DIST_PATH = '/Users/duartemendes/deadhappy/repos/deathwish-api/dist';
const API_NAME = 'deathwish-api';

const templateYaml = readFileSync('./fixtures/template.yaml', 'utf-8');
const templateYamlWithoutFns = templateYaml.replace(/!/g, '');
const template = yaml.safeLoad(templateYamlWithoutFns);
const globalRuntime = template?.Globals?.Function?.Runtime;

const isApiEvent = ({ Type }) => Type.includes('Api');
const docker = new Docker();

const buildHeaders = (rawHeaders) => rawHeaders.reduce((result, current, i) => {
  if (i % 2 === 0) {
    result[current] = rawHeaders[i+1];
  }
  return result;
}, {});

const killOldContainers = async () => {
  const containersData = await docker.listContainers({ all: true, filters: { label: [`aws-sam-api-proxy.api=${API_NAME}`] } });
  console.log(`Found ${containersData.length} containers for this api, removing...`);

  const containers = await Promise.all(containersData.map(({ Id }) => docker.getContainer(Id)));
  return Promise.all(containers.map((container) => container.remove({ force: true })));
}

const buildFnPathData = (path) => {
  const splittedPath = path.split('/');
  const splittedData = splittedPath.map((part) => {
    const isParameter = part.startsWith('{');
    const data = isParameter ? part.replace(/{|}/g, '') : part;
    return { isParameter, data }
  });

  return {
    full: path,
    splitted: splittedData,
  };
}

const parseFunctions = () => Object.entries(envVars).reduce((result, [functionName, environment], i) => {
  const resource = template.Resources[functionName];
  if (!resource) throw new Error(`Function with name "${functionName}" not found in SAM template`);

  const { Events, Handler, Runtime } = resource.Properties;

  const apiEvent = Object.values(Events).find(isApiEvent);
  if (!apiEvent) throw new Error(`Api event not found for function with name "${functionName}"`);

  const { Type, Properties: { Path, Method, PayloadFormatVersion } } = apiEvent;
  const runtime = Runtime ?? globalRuntime;

  return result.concat({
    name: functionName,
    handler: Handler,
    event: {
      type: Type,
      payloadFormatVersion: PayloadFormatVersion
    },
    path: buildFnPathData(Path.toLowerCase()),
    method: Method.toLowerCase(),
    containerPort: PORT + i + 1,
    environment,
    dockerImageWithTag: `${DOCKER_IMAGE}:${runtime}`,
  });
}, []);

const pullDockerImages = async (functions) => {
  const dockerImagesWithTag = functions
    .map(({ dockerImageWithTag }) => dockerImageWithTag)
    .filter((value, i, array) => array.indexOf(value) === i);

  console.log('Pulling required docker images, this might take a while...', dockerImagesWithTag);

  const promises = dockerImagesWithTag.map((dockerImageWithTag) => new Promise((resolve, reject) => {
    docker.pull(dockerImageWithTag, (err, stream) => {
      const onFinished = (err, output) => {
        err ? reject(err) : resolve(output);
      };
      const onProgress = (event) => {
        console.log(event.status);
      };
      docker.modem.followProgress(stream, onFinished, onProgress);
    });
  }));

  await Promise.all(promises);
  console.log('All required docker images have been pulled successfully.');
}

const createContainers = async (functions) => {
  const promises = functions.map(async ({ name, environment, containerPort, handler, dockerImageWithTag }) => {
    const options = {
      Image: dockerImageWithTag,
      name: `${snakeCase(name)}_lambda`,
      Cmd: [handler],
      Env: [
        'DOCKER_LAMBDA_WATCH=1',
        'DOCKER_LAMBDA_STAY_OPEN=1',
        ...Object.entries(environment).map(([key, value]) => `${key}=${value}`)
      ],
      Labels: { 'aws-sam-api-proxy.api': API_NAME },
      ExposedPorts: { '9001/tcp': {} },
      Volumes: { '/var/task': {} },
      HostConfig: {
        Binds: [`${DIST_PATH}:/var/task:ro,delegated`],
        PortBindings: { '9001/tcp': [{ HostPort: `${containerPort}` }] },
        NetworkMode: DOCKER_NETWORK
      }
    };

    const container = await docker.createContainer(options);
    console.log('Starting container', { id: container.id, name: options.name, exposedPort: containerPort });
    await container.start()
    return container.id;
  });

  return Promise.all(promises);
}

const matchFunctions = (functions, { path, method }) => functions.filter((fn) => {
  if (fn.method !== method.toLowerCase()) return false;

  const splittedPath = path.toLowerCase().split('/');
  if (fn.path.splitted.length !== splittedPath.length) return false;

  return fn.path.splitted.every(({ isParameter, data }, i) => isParameter || data === splittedPath[i]);
});

const spinUpServer = (functions) => {
  const server = http.createServer();

  server.on('request', async (req, res) => {
    const id = uuidv4();
    const { url, method, rawHeaders } = req;
    const [path, querystring] = url.split('?');
    const headers = buildHeaders(rawHeaders);
    console.log(`[${id}] Received request`, { url, method, headers, path, qs: querystring });

    let body = '';
    req.on('readable', () => {
      const buffer = req.read();
      if (buffer != null) {
        body += buffer.toString();
      }
    });

    req.on('end', async () => {
      const compatibleFns = matchFunctions(functions, { path, method });
      if (compatibleFns.length === 0) return res.writeHead(404).end(JSON.stringify({ status: 'error', message: 'Failed to find a match for this request' }));
      if (compatibleFns.length > 1) return res.writeHead(500).end(JSON.stringify({ status: 'error', message: 'Found multiple matches for this request, must revisit matching functions logic' }));
      const fnData = compatibleFns[0];
      const { containerPort } = fnData;
      console.log(`[${id}] Proxying request to port ${containerPort}`);

      const urlToCall = `http://localhost:${containerPort}/2015-03-31/functions/myfunction/invocations`;
      const event = createApiGatewayProxyEvent(fnData, { headers, path, method, body, querystring });

      const startDate = new Date();
      const { statusCode, headers: resHeaders, body: resBody } = await got.post(urlToCall, { json: event }).json();

      console.log(`[${id}] Request took ${new Date() - startDate} ms`);

      res.writeHead(statusCode, resHeaders).end(resBody);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    const endpoints = functions.map(({ method, path }) => ({ method: method.toUpperCase(), path: path.full }));
    console.log('The following endpoints are exposed:');
    console.table(endpoints);
  });
}

async function go() {
  const ping = await docker.ping();
  if (ping.toString() !== 'OK') throw new Error('Docker must be running');

  try {
    await killOldContainers();

    const functions = parseFunctions();

    await pullDockerImages(functions);

    await createContainers(functions);

    spinUpServer(functions);
  } catch (err) {
    console.log(err);
  }
}

go();
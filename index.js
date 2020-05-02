import http from 'http';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import Docker from 'dockerode';
import got from 'got';
import { v4 as uuidv4 } from 'uuid';
import envVars from './fixtures/envVars-temp.json';
import createApiGatewayProxyEvent from './src/apiGatewayProxyEvent';
import createDockerService from './src/dockerService';
import {
  parseFunctionsFromTemplate,
  matchFunctionAgainstRequest,
} from './src/serverlessFunctions';

const PORT = Number(process.env.PORT);

const templateYaml = readFileSync('./fixtures/template.yaml', 'utf-8');
const templateYamlWithoutFns = templateYaml.replace(/!/g, '');
const template = yaml.safeLoad(templateYamlWithoutFns);

const docker = new Docker();

const buildHeaders = (rawHeaders) => rawHeaders.reduce((result, current, i) => {
  if (i % 2 === 0) {
    result[current] = rawHeaders[i+1];
  }
  return result;
}, {});

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
      const compatibleFns = matchFunctionAgainstRequest(functions, { path, method });
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
  try {
    const ping = await docker.ping();
    if (ping.toString() !== 'OK') throw new Error('Docker must be running');

    const functions = parseFunctionsFromTemplate(template, envVars, PORT + 1);
    const dockerService = createDockerService(docker, functions);

    await Promise.all([
      dockerService.killOldContainers(),
      dockerService.pullRequiredDockerImages(),
    ]);

    await dockerService.createContainers();

    spinUpServer(functions);
  } catch (err) {
    console.log(err);
  }
}

go();
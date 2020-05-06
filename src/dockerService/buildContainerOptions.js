import snakeCase from 'lodash.snakecase';

export default ({
  name, environment, containerPort, handler, dockerImageWithTag, distPath,
}) => ({
  Image: dockerImageWithTag,
  name: `${snakeCase(name)}_lambda`,
  Cmd: [handler],
  Env: [
    'DOCKER_LAMBDA_WATCH=1',
    'DOCKER_LAMBDA_STAY_OPEN=1',
    ...Object.entries(environment).map(([key, value]) => `${key}=${value}`),
  ],
  Labels: { 'aws-sam-api-proxy.api': process.env.API_NAME },
  ExposedPorts: { '9001/tcp': {} },
  Volumes: { '/var/task': {} },
  HostConfig: {
    Binds: [`${distPath}:/var/task:ro,delegated`],
    PortBindings: { '9001/tcp': [{ HostPort: `${containerPort}` }] },
    NetworkMode: process.env.DOCKER_NETWORK,
  },
});

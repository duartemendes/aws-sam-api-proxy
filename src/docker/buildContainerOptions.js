import snakeCase from 'lodash.snakecase';

export default (
  {
    name,
    environment,
    containerPort,
    handler,
    memorySize,
    timeout,
    dockerImageWithTag,
    distPath,
    layers = [],
  },
  {
    apiName, dockerNetwork, awsCredentialsFolder,
  },
) => {
  const containerOption = {
    Image: dockerImageWithTag,
    name: `${snakeCase(name)}_lambda`,
    Cmd: [handler],
    Env: [
      `AWS_LAMBDA_FUNCTION_MEMORY_SIZE=${memorySize}`,
      `AWS_LAMBDA_FUNCTION_TIMEOUT=${timeout}`,
      'DOCKER_LAMBDA_WATCH=1',
      'DOCKER_LAMBDA_STAY_OPEN=1',
      ...Object.entries(environment).map(([key, value]) => `${key}=${value}`),
    ],
    Labels: { 'aws-sam-api-proxy.api': apiName },
    ExposedPorts: { '9001/tcp': {} },
    Volumes: { '/var/task': {}, ...(awsCredentialsFolder ? { '/home/sbx_user1051/.aws': {} } : {}), ...(layers.length > 0 ? { '/opt': {} } : {}) },
    HostConfig: {
      Binds: [`${distPath}:/var/task:ro,delegated`, ...(awsCredentialsFolder ? [`${awsCredentialsFolder}:/home/sbx_user1051/.aws:ro,delegated`] : []), ...(layers.map((l) => `${l.hostSource}:${l.containerDestination}:ro,delegated`))],
      PortBindings: { '9001/tcp': [{ HostPort: `${containerPort}` }] },
      ...(dockerNetwork !== undefined ? { NetworkMode: dockerNetwork } : {}),
    },
  };

  return containerOption;
};

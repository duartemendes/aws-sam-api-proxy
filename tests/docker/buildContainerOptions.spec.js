import { buildContainerOptions } from '../../src/docker';

describe('buildContainerOptions()', () => {
  const apiName = 'test-api';
  const dockerNetwork = 'test_network';

  it('should build container options from function data', () => {
    const functionData = {
      name: 'GetResource',
      environment: {
        DB_NAME: 'test_database',
        FEATURE_FLAG: '10%',
      },
      containerPort: 3001,
      handler: 'GetResourceHandler.default',
      dockerImageWithTag: 'lambci/lambda:nodejs12.x',
      distPath: '/Users/foo/api/dist',
    };

    const containerOptions = buildContainerOptions(functionData, { apiName, dockerNetwork });

    expect(containerOptions).toEqual({
      Image: functionData.dockerImageWithTag,
      name: 'get_resource_lambda',
      Cmd: [
        functionData.handler,
      ],
      Env: [
        'DOCKER_LAMBDA_WATCH=1',
        'DOCKER_LAMBDA_STAY_OPEN=1',
        'DB_NAME=test_database',
        'FEATURE_FLAG=10%',
      ],
      Labels: {
        'aws-sam-api-proxy.api': apiName,
      },
      ExposedPorts: {
        '9001/tcp': {},
      },
      Volumes: {
        '/var/task': {},
      },
      HostConfig: {
        Binds: [
          `${functionData.distPath}:/var/task:ro,delegated`,
        ],
        PortBindings: {
          '9001/tcp': [
            {
              HostPort: `${functionData.containerPort}`,
            },
          ],
        },
        NetworkMode: dockerNetwork,
      },
    });
  });

  it('should not set NetworkMode when dockerNetwork is not given', () => {
    const functionData = {
      name: 'GetResource',
      environment: {
        DB_NAME: 'test_database',
        FEATURE_FLAG: '10%',
      },
      containerPort: 3001,
      handler: 'GetResourceHandler.default',
      dockerImageWithTag: 'lambci/lambda:nodejs12.x',
      distPath: '/Users/foo/api/dist',
    };

    const containerOptions = buildContainerOptions(functionData, { apiName });

    expect(containerOptions.NetworkMode).toBeUndefined();
  });
});

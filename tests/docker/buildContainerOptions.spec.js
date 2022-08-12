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
      memorySize: 256,
      timeout: 10,
      dockerImageWithTag: 'lambci/lambda:nodejs12.x',
      distPath: '/Users/foo/api/dist',
      layers: [],
    };

    const containerOptions = buildContainerOptions(functionData, { apiName, dockerNetwork });

    expect(containerOptions).toEqual({
      Image: functionData.dockerImageWithTag,
      name: 'get_resource_lambda',
      Cmd: [
        functionData.handler,
      ],
      Env: [
        'AWS_LAMBDA_FUNCTION_MEMORY_SIZE=256',
        'AWS_LAMBDA_FUNCTION_TIMEOUT=10',
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

  it('should set layers when specified in the template', () => {
    const functionData = {
      name: 'GetResource',
      environment: {
        DB_NAME: 'test_database',
        FEATURE_FLAG: '10%',
      },
      containerPort: 3001,
      handler: 'GetResourceHandler.default',
      memorySize: 256,
      timeout: 10,
      dockerImageWithTag: 'lambci/lambda:nodejs12.x',
      distPath: '/Users/foo/api/dist',
      layers: [{
        hostSource: '/Users/foo/api/dist/layer',
        containerDestination: '/opt',
      }],
    };

    const containerOptions = buildContainerOptions(functionData, { apiName, dockerNetwork });

    expect(containerOptions).toEqual({
      Image: functionData.dockerImageWithTag,
      name: 'get_resource_lambda',
      Cmd: [
        functionData.handler,
      ],
      Env: [
        'AWS_LAMBDA_FUNCTION_MEMORY_SIZE=256',
        'AWS_LAMBDA_FUNCTION_TIMEOUT=10',
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
        '/opt': {},
      },
      HostConfig: {
        Binds: [
          `${functionData.distPath}:/var/task:ro,delegated`,
          `${functionData.layers[0].hostSource}:${functionData.layers[0].containerDestination}:ro,delegated`,
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

  it('should set an aws credentials file layer when passed in as a cli option', () => {
    const functionData = {
      name: 'GetResource',
      environment: {
        DB_NAME: 'test_database',
        FEATURE_FLAG: '10%',
      },
      containerPort: 3001,
      handler: 'GetResourceHandler.default',
      memorySize: 256,
      timeout: 10,
      dockerImageWithTag: 'lambci/lambda:nodejs12.x',
      distPath: '/Users/foo/api/dist',
      layers: [],
    };

    const awsCredentialsFolder = '/Users/john/.aws';
    const containerOptions = buildContainerOptions(functionData, {
      apiName,
      dockerNetwork,
      awsCredentialsFolder,
    });

    expect(containerOptions).toEqual({
      Image: functionData.dockerImageWithTag,
      name: 'get_resource_lambda',
      Cmd: [
        functionData.handler,
      ],
      Env: [
        'AWS_LAMBDA_FUNCTION_MEMORY_SIZE=256',
        'AWS_LAMBDA_FUNCTION_TIMEOUT=10',
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
        '/home/sbx_user1051/.aws': {},
      },
      HostConfig: {
        Binds: [
          `${functionData.distPath}:/var/task:ro,delegated`,
          `${awsCredentialsFolder}:/home/sbx_user1051/.aws:ro,delegated`,
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
});

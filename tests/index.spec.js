import path from 'path';
import startApi from '../src';
import spinUpServer from '../src/server';
import { parseFunctionsFromTemplate } from '../src/serverlessFunctions';
import functions from './fixtures/functions';

jest.mock('../src/server.js');
jest.mock('../src/serverlessFunctions', () => ({
  __esModule: true,
  parseFunctionsFromTemplate: jest.fn(),
}));

describe('index', () => {
  const options = {
    apiName: 'test-api',
    basePath: __dirname,
    port: 3000,
    template: './fixtures/template.yaml',
    envVars: './fixtures/envVars.json',
  };
  let dockerServiceStub;

  beforeAll(() => {
    parseFunctionsFromTemplate.mockReturnValue(functions);

    dockerServiceStub = {
      removeApiContainers: jest.fn(),
      pullRequiredDockerImages: jest.fn(),
      createContainers: jest.fn(),
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should remove api containers, pull images, create the containers and spin up a server', async () => {
    await startApi(dockerServiceStub, options);

    expect(parseFunctionsFromTemplate).toHaveBeenCalledTimes(1);

    expect(dockerServiceStub.removeApiContainers).toHaveBeenCalledTimes(1);
    expect(dockerServiceStub.removeApiContainers).toHaveBeenCalledWith(options.apiName);

    expect(dockerServiceStub.pullRequiredDockerImages).toHaveBeenCalledTimes(1);
    expect(dockerServiceStub.pullRequiredDockerImages).toHaveBeenCalledWith(functions);

    expect(dockerServiceStub.createContainers).toHaveBeenCalledTimes(1);
    expect(dockerServiceStub.createContainers).toHaveBeenCalledWith(functions, options);

    expect(spinUpServer).toHaveBeenCalledTimes(1);
    expect(spinUpServer).toHaveBeenCalledWith(functions, options.port, options.apiName);
  });
});

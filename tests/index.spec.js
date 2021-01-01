import startApi from '../src';
import spinUpServer from '../src/server';
import { parseFunctionsFromTemplate } from '../src/serverlessFunctions';
import { buildContainerOptions } from '../src/docker';
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
    logLevel: 'debug',
  };
  let dockerServiceStub;

  beforeAll(() => {
    parseFunctionsFromTemplate.mockReturnValue(functions);

    dockerServiceStub = {
      removeApiContainers: jest.fn(),
      pullImages: jest.fn(),
      createContainers: jest.fn(),
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should remove api containers, pull distinct docker images, create the containers and spin up a server', async () => {
    await startApi(dockerServiceStub, options);

    expect(parseFunctionsFromTemplate).toHaveBeenCalledTimes(1);

    expect(dockerServiceStub.removeApiContainers).toHaveBeenCalledTimes(1);
    expect(dockerServiceStub.removeApiContainers).toHaveBeenCalledWith(options.apiName);

    expect(dockerServiceStub.pullImages).toHaveBeenCalledTimes(1);
    expect(dockerServiceStub.pullImages).toHaveBeenCalledWith([
      'lambci/lambda:nodejs12.x',
      'lambci/lambda:nodejs10.x',
    ]);

    expect(dockerServiceStub.createContainers).toHaveBeenCalledTimes(1);
    expect(dockerServiceStub.createContainers).toHaveBeenCalledWith(
      functions.map((fn) => buildContainerOptions(fn, options)),
    );

    expect(spinUpServer).toHaveBeenCalledTimes(1);
    expect(spinUpServer).toHaveBeenCalledWith(functions, options.port, options.apiName);
  });

  it('should be able to skip to pull images', async () => {
    await startApi(dockerServiceStub, { ...options, skipPullImages: true });

    expect(dockerServiceStub.pullImages).toHaveBeenCalledTimes(0);
  });

  it('should set envVars as an empty object when no envVars path is given', async () => {
    await startApi(dockerServiceStub, { ...options, envVars: undefined });

    expect(parseFunctionsFromTemplate).toHaveBeenCalledTimes(1);
    expect(parseFunctionsFromTemplate.mock.calls[0][1]).toEqual({});
  });

  it('should parse ref-overrides correctly', async () => {
    await startApi(dockerServiceStub, { ...options, refOverrides: 'A=1,B=two,API_KEY=tok_1234' });

    expect(parseFunctionsFromTemplate).toHaveBeenCalledTimes(1);
    expect(parseFunctionsFromTemplate.mock.calls[0][4]).toEqual({
      A: '1',
      B: 'two',
      API_KEY: 'tok_1234',
    });
  });
});

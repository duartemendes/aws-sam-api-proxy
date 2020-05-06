import createDockerService from '../../src/dockerService';
import functions from '../fixtures/functions';

describe('dockerService', () => {
  const apiName = 'test-api';
  let dockerStub;
  let startContainerMock;
  let removeContainerMock;
  let dockerService;

  beforeAll(() => {
    startContainerMock = jest.fn();
    removeContainerMock = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(() => {});

    dockerStub = {
      ping: jest.fn(),
      listContainers: jest.fn(),
      getContainer: jest.fn()
        .mockImplementation(async () => ({
          remove: removeContainerMock,
        })),
      createContainer: jest.fn()
        .mockImplementation(async () => ({
          start: startContainerMock,
          id: 'id',
        })),
      pull: jest.fn()
        .mockImplementation((_, callback) => callback(null, null)),
      modem: {
        followProgress: jest.fn()
          .mockImplementation((_, onFinished) => onFinished()),
      },
    };

    dockerService = createDockerService(dockerStub);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('validateDockerStatus()', () => {
    it('should throw an error when docker ping return a status other than OK', async () => {
      dockerStub.ping.mockResolvedValueOnce('ERROR');

      await expect(dockerService.validateDockerStatus()).rejects.toThrowError(
        'Docker must be running',
      );
    });
  });

  describe('removeAllContainers()', () => {
    it('should remove all containers', async () => {
      const containersData = [
        { Id: '8e9d292554ec' },
        { Id: 'a4450e5fb9da' },
        { Id: '593806a20f0e' },
      ];
      dockerStub.listContainers.mockResolvedValueOnce(containersData);

      await dockerService.removeAllContainers();

      expect(dockerStub.listContainers).toHaveBeenCalledWith({
        all: true,
        filters: {
          label: ['aws-sam-api-proxy.api'],
        },
      });
      expect(removeContainerMock).toHaveBeenCalledTimes(containersData.length);
      expect(removeContainerMock).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('removeApiContainers()', () => {
    it('should remove all containers for given api', async () => {
      const containersData = [
        { Id: '8e9d292554ec' },
        { Id: 'a4450e5fb9da' },
        { Id: '593806a20f0e' },
      ];
      dockerStub.listContainers.mockResolvedValueOnce(containersData);

      await dockerService.removeApiContainers(apiName);

      expect(dockerStub.listContainers).toHaveBeenCalledWith({
        all: true,
        filters: {
          label: [`aws-sam-api-proxy.api=${apiName}`],
        },
      });
      expect(removeContainerMock).toHaveBeenCalledTimes(containersData.length);
      expect(removeContainerMock).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('pullRequiredDockerImages()', () => {
    it('should pull only distinct docker images', async () => {
      await dockerService.pullRequiredDockerImages(functions);

      expect(dockerStub.pull).toHaveBeenCalledTimes(2);
      expect(dockerStub.pull.mock.calls[0][0]).toEqual('lambci/lambda:nodejs12.x');
      expect(dockerStub.pull.mock.calls[1][0]).toEqual('lambci/lambda:nodejs10.x');
    });
  });

  describe('createContainers()', () => {
    it('should create and start one container per function', async () => {
      const containersIds = await dockerService.createContainers(functions, { apiName });

      expect(containersIds).toHaveLength(functions.length);
      expect(dockerStub.createContainer).toHaveBeenCalledTimes(functions.length);
      expect(startContainerMock).toHaveBeenCalledTimes(functions.length);
    });
  });
});

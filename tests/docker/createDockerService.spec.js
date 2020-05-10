import { createDockerService } from '../../src/docker';
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

  describe('pullImages()', () => {
    it('should all given docker images', async () => {
      const images = ['lambci/lambda:nodejs12.x', 'lambci/lambda:nodejs10.x'];

      await dockerService.pullImages(images);

      expect(dockerStub.pull).toHaveBeenCalledTimes(2);
      expect(dockerStub.pull.mock.calls[0][0]).toEqual(images[0]);
      expect(dockerStub.pull.mock.calls[1][0]).toEqual(images[1]);
    });
  });

  describe('createContainers()', () => {
    it('should create and start one container per function', async () => {
      const containersOptions = [
        { Image: 'lambci/lambda:nodejs12.x' },
        { Image: 'lambci/lambda:nodejs12.x' },
        { Image: 'lambci/lambda:nodejs12.x' },
      ];

      const containersIds = await dockerService.createContainers(containersOptions);

      expect(containersIds).toHaveLength(containersOptions.length);
      expect(dockerStub.createContainer).toHaveBeenCalledTimes(containersOptions.length);
      expect(startContainerMock).toHaveBeenCalledTimes(containersOptions.length);
    });
  });
});

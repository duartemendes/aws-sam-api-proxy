import createDockerService from '../../src/dockerService';
import functions from '../fixtures/functions';

describe('dockerService', () => {
  const apiName = 'test-api';
  let dockerStub;
  let startContainerMock;
  let removeContainerMock;
  let dockerService;

  beforeAll(() => {
    process.env.API_NAME = apiName;
    startContainerMock = jest.fn();
    removeContainerMock = jest.fn();
    jest.spyOn(console, 'log').mockImplementation(() => {});

    dockerStub = {
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

    dockerService = createDockerService(dockerStub, functions);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.API_NAME;
    jest.restoreAllMocks();
  });

  describe('removeOldContainers()', () => {
    it('should remove all containers with api label', async () => {
      const containersData = [
        { Id: '8e9d292554ec' },
        { Id: 'a4450e5fb9da' },
        { Id: '593806a20f0e' },
      ];
      dockerStub.listContainers.mockResolvedValueOnce(containersData);

      await dockerService.removeOldContainers();

      expect(dockerStub.listContainers).toHaveBeenCalledWith({
        all: true,
        filters: {
          label: [
            `aws-sam-api-proxy.api=${apiName}`,
          ],
        },
      });
      expect(removeContainerMock).toHaveBeenCalledTimes(containersData.length);
      expect(removeContainerMock).toHaveBeenCalledWith({ force: true });
    });
  });

  describe('pullRequiredDockerImages()', () => {
    it('should pull only distinct docker images', async () => {
      await dockerService.pullRequiredDockerImages();

      expect(dockerStub.pull).toHaveBeenCalledTimes(2);
      expect(dockerStub.pull.mock.calls[0][0]).toEqual('lambci/lambda:nodejs12.x');
      expect(dockerStub.pull.mock.calls[1][0]).toEqual('lambci/lambda:nodejs10.x');
    });
  });

  describe('createContainers()', () => {
    it('should create and start one container per function', async () => {
      const containersIds = await dockerService.createContainers();

      expect(containersIds).toHaveLength(functions.length);
      expect(dockerStub.createContainer).toHaveBeenCalledTimes(functions.length);
      expect(startContainerMock).toHaveBeenCalledTimes(functions.length);
    });
  });
});

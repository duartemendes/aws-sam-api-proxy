import createController from '../../src/controller';
import functions from '../fixtures/functions';
import createApiGatewayProxyEvent from '../../src/apiGatewayProxyEvent';

const functionsWithReplicatedValue = [...functions, functions[functions.length - 1]];

describe('controller', () => {
  let req;
  let res;
  let httpClientStub;
  let controller;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    req = {
      path: '/resources/1',
      url: '/resources/1',
      rawHeaders: ['Accept', 'application/json'],
      on: jest.fn(),
    };

    res = {
      writeHead: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };

    httpClientStub = {
      post: jest.fn(),
    };

    controller = createController(httpClientStub, functionsWithReplicatedValue);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 when no match for given request is found', async () => {
    controller({ ...req, method: 'DELETE' }, res);

    expect(req.on).toHaveBeenCalledTimes(2);
    const onEndCallback = req.on.mock.calls[1][1];

    await onEndCallback();

    expect(res.writeHead).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();
    expect(httpClientStub.post).not.toHaveBeenCalled();
  });

  it('should return 500 when an unexpected error occurs', async () => {
    httpClientStub.post.mockReturnValueOnce();
    controller({ ...req, method: 'GET' }, res);

    expect(req.on).toHaveBeenCalledTimes(2);
    const onEndCallback = req.on.mock.calls[1][1];

    await onEndCallback();

    expect(res.writeHead).toHaveBeenCalledWith(500);
    expect(res.end).toHaveBeenCalled();
    expect(httpClientStub.post).toHaveBeenCalled();
  });

  it('should return 502 when upstream return an error', async () => {
    const upstreamResponse = {
      errorType: 'Error',
      errorMessage: 'Failed to initialize handler',
    };
    httpClientStub.post.mockReturnValueOnce({
      json: jest.fn().mockResolvedValueOnce(upstreamResponse),
    });
    controller({ ...req, method: 'GET' }, res);

    expect(req.on).toHaveBeenCalledTimes(2);
    const onEndCallback = req.on.mock.calls[1][1];

    await onEndCallback();

    expect(res.writeHead).toHaveBeenCalledWith(502);
    expect(res.end).toHaveBeenCalled();
    expect(httpClientStub.post).toHaveBeenCalled();
  });

  it('should return status code, headers and body from integration when a single match is found for the given request', async () => {
    const event = createApiGatewayProxyEvent(functionsWithReplicatedValue[1], {
      headers: {
        Accept: 'application/json',
      },
      path: req.path,
      method: 'GET',
      body: null,
      querystring: '',
    });
    const upstreamResponse = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
      },
      body: JSON.stringify({ key: 'value' }),
    };
    httpClientStub.post.mockReturnValueOnce({
      json: jest.fn().mockResolvedValueOnce(upstreamResponse),
    });

    controller({ ...req, method: 'GET' }, res);

    expect(req.on).toHaveBeenCalledTimes(2);
    const onEndCallback = req.on.mock.calls[1][1];

    await onEndCallback();

    expect(res.writeHead).toHaveBeenCalledWith(
      upstreamResponse.statusCode,
      upstreamResponse.headers,
    );
    expect(res.end).toHaveBeenCalledWith(upstreamResponse.body);
    expect(httpClientStub.post).toHaveBeenCalledTimes(1);
    const { containerPort } = functionsWithReplicatedValue[1];
    expect(httpClientStub.post).toHaveBeenCalledWith(
      `http://localhost:${containerPort}/2015-03-31/functions/myfunction/invocations`,
      { json: event },
    );
  });
});

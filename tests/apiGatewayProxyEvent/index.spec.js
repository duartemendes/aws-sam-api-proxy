import createApiGatewayProxyEvent from '../../src/apiGatewayProxyEvent';
import functions from '../fixtures/functions';

describe('createApiGatewayProxyEvent()', () => {
  const request = {
    headers: {
      Authorization: 'Basic YWxhZGRpbjpvcGVuc2VzYW1l',
    },
    path: '/resources/1',
    method: 'get',
    body: '',
    querystring: 'enabled=true',
  };

  it('should build event for RestApi when type is Api', () => {
    const functionData = {
      ...functions[1],
      event: {
        type: 'Api',
      },
    };

    const event = createApiGatewayProxyEvent(functionData, request);

    expect(event).toEqual({
      body: request.body,
      headers: request.headers,
      pathParameters: {
        id: '1',
      },
      queryStringParameters: {
        enabled: 'true',
      },
      isBase64Encoded: false,
      stageVariables: null,
      requestContext: {},
      path: request.path,
      httpMethod: request.method,
      multiValueHeaders: null,
      multiValueQueryStringParameters: null,
      resource: '/{proxy+}',
    });
  });

  it('should build event for HttpApi 1.0 when given PayloadFormatVersion is 1.0', () => {
    const functionData = {
      ...functions[1],
      event: {
        type: 'HttpApi',
        payloadFormatVersion: '1.0',
      },
    };

    const event = createApiGatewayProxyEvent(functionData, request);

    expect(event).toEqual({
      body: request.body,
      headers: request.headers,
      pathParameters: {
        id: '1',
      },
      queryStringParameters: {
        enabled: 'true',
      },
      isBase64Encoded: false,
      stageVariables: null,
      requestContext: {},
      path: request.path,
      httpMethod: request.method,
      multiValueHeaders: null,
      multiValueQueryStringParameters: null,
      resource: '/{proxy+}',
      version: '1.0',
    });
  });

  it('should build event for HttpApi 2.0 when no PayloadFormatVersion is given', () => {
    const functionData = {
      ...functions[1],
      event: {
        type: 'HttpApi',
      },
    };

    const event = createApiGatewayProxyEvent(functionData, request);

    expect(event).toEqual({
      body: request.body,
      headers: request.headers,
      pathParameters: {
        id: '1',
      },
      queryStringParameters: {
        enabled: 'true',
      },
      isBase64Encoded: false,
      stageVariables: null,
      requestContext: {},
      rawPath: request.path,
      routeKey: '$default',
      rawQueryString: request.querystring,
      cookies: null,
      version: '2.0',
    });
  });
});

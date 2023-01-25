import { v4 as uuidv4 } from 'uuid';

export const makeMultiValueHeaders = (headers) => {
  const multiValueHeaders = {};

  Object.entries(headers).forEach(([key, val]) => {
    multiValueHeaders[key] = [val];
  });

  return multiValueHeaders;
};

export const makeRequestContext = ({ headers, method, path }) => (
  {
    accountId: '123456789012',
    apiId: '1234567890',
    domainName: headers.Host,
    extendedRequestId: null,
    httpMethod: method,
    identity: {
      accountId: '123456789012',
      apiKey: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityPoolId: null,
      sourceIp: '127.0.0.1',
      user: null,
      userAgent: 'Custom User Agent String',
      userArn: null,
    },
    path,
    protocol: 'HTTP/1.1',
    requestId: uuidv4(),
    requestTime: (new Date()).toISOString(),
    requestTimeEpoch: Math.floor(Date.now() / 1000),
    resourceId: '123456',
    resourcePath: path,
    stage: 'dev',
  }
);

export default ({ method, path, headers }) => ({
  path,
  httpMethod: method,
  multiValueHeaders: makeMultiValueHeaders(headers),
  multiValueQueryStringParameters: null,
  requestContext: makeRequestContext({ method, path, headers }),
  resource: path,
});

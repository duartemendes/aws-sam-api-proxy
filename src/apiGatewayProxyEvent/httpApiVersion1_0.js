export default ({ path, method }) => ({
  path,
  httpMethod: method,
  multiValueHeaders: null,
  multiValueQueryStringParameters: null,
  resource: '/{proxy+}',
  version: '1.0',
});

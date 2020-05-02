export default ({ method, path }) => ({
  path,
  httpMethod: method,
  multiValueHeaders: null,
  multiValueQueryStringParameters: null,
  resource: '/{proxy+}',
});

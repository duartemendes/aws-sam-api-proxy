export default ({ path, method }) => {
  return {
    path,
    httpMethod: method,
    multiValueHeaders: null,
    multiValueQueryStringParameters: null,
    resource: '/{proxy+}',
    version: '1.0',
  };
};

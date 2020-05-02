export default ({ method, path }) => {
  return {
    path,
    httpMethod: method,
    multiValueHeaders: null,
    multiValueQueryStringParameters: null,
    resource: '/{proxy+}',
  };
};

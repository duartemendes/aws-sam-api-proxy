export default ({ path, querystring }) => {
  return {
    rawPath: path,
    routeKey: '$default',
    rawQueryString: querystring,
    cookies: null,
    version: '2.0',
  };
};

/* eslint-disable camelcase */
import qs from 'querystring';
import api from './api';
import httpApiVersion1_0 from './httpApiVersion1_0';
import httpApiVersion2_0 from './httpApiVersion2_0';

const buildPathParameters = (fnPath, path) => path.split('/')
  .reduce((result, current, i) => {
    if (fnPath.splitted[i].isParameter) {
      const key = fnPath.splitted[i].data;
      // eslint-disable-next-line no-param-reassign
      result[key] = current;
    }
    return result;
  }, {});

const getEventBuildStrategy = ({ type, payloadFormatVersion }) => {
  if (type.toLowerCase() === 'api') return api;
  return payloadFormatVersion === '1.0' ? httpApiVersion1_0 : httpApiVersion2_0;
};

export default ({ path: fnPath, event }, {
  headers, path, method, body, querystring,
}) => {
  const pathParameters = buildPathParameters(fnPath, path);
  const queryStringParameters = qs.parse(querystring);

  const common = {
    body,
    headers,
    pathParameters,
    queryStringParameters,
    isBase64Encoded: false,
    stageVariables: null,
    requestContext: null,
  };

  const eventBuildStrategy = getEventBuildStrategy(event);
  const specific = eventBuildStrategy({ path, method, querystring });

  return { ...common, ...specific };
};

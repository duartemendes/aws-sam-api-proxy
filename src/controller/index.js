import { v4 as uuidv4 } from 'uuid';
import createApiGatewayProxyEvent from '../apiGatewayProxyEvent';
import { matchFunctionsAgainstRequest } from '../serverlessFunctions';

const buildHeaders = (rawHeaders) => rawHeaders.reduce((result, current, i) => {
  if (i % 2 === 0) {
    // eslint-disable-next-line no-param-reassign
    result[current] = rawHeaders[i + 1];
  }
  return result;
}, {});

export default (httpClient, functions) => (req, res) => {
  const id = uuidv4();
  const { url, method, rawHeaders } = req;
  const [path, querystring] = url.split('?');
  const headers = buildHeaders(rawHeaders);

  console.log(`[${id}] Received request`, {
    url, method, headers, path, qs: querystring,
  });

  let body = '';
  req.on('readable', () => {
    const buffer = req.read();
    if (buffer != null) {
      body += buffer.toString();
    }
  });

  const sendError = (code, message) => res.writeHead(code).end(JSON.stringify({ status: 'error', message }));

  req.on('end', async () => {
    const matchesFns = matchFunctionsAgainstRequest(functions, { path, method });
    if (matchesFns.length === 0) return sendError(404, 'Failed to find a match for this request');
    if (matchesFns.length > 1) return sendError(500, 'Found multiple matches for this request, must revisit matching functions logic');

    const matchedFn = matchesFns[0];
    const { containerPort } = matchedFn;
    console.log(`[${id}] Proxying request to port ${containerPort}`);

    const urlToCall = `http://localhost:${containerPort}/2015-03-31/functions/myfunction/invocations`;
    const event = createApiGatewayProxyEvent(matchedFn, {
      headers, path, method, body, querystring,
    });

    const startDate = new Date();
    const upstreamResponse = await httpClient.post(urlToCall, { json: event }).json();

    const requestDurationInMs = new Date() - startDate;
    console.log(`[${id}] Http request to lambda function took ${requestDurationInMs} ms`);

    const { statusCode, headers: resHeaders, body: resBody } = upstreamResponse;
    return res.writeHead(statusCode, resHeaders).end(resBody);
  });
};

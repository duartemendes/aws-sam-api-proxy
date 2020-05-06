import { v4 as uuidv4 } from 'uuid';
import createApiGatewayProxyEvent from '../apiGatewayProxyEvent';
import { matchFunctionsAgainstRequest } from '../serverlessFunctions';
import { buildFromRawHeaders } from '../request';

export default (httpClient, functions) => (req, res) => {
  const id = uuidv4();
  const { url, method, rawHeaders } = req;
  const [path, querystring = ''] = url.split('?');
  const headers = buildFromRawHeaders(rawHeaders ?? []);

  console.log(`[${id}] Received request`, {
    url, method, headers, path, qs: querystring,
  });

  let body = null;
  req.on('readable', () => {
    const buffer = req.read();
    if (buffer != null) {
      body = `${body ?? ''}${buffer.toString()}`;
    }
  });

  const sendError = (code, message) => res.writeHead(code).end(JSON.stringify({ status: 'error', message }));
  const asyncTryOrFail = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      console.log(`[${id}] Failed with error`, err);
      return sendError(500, err.message);
    }
  };

  req.on('end', async () => asyncTryOrFail(async () => {
    const matchesFns = matchFunctionsAgainstRequest(functions, { path, method });
    if (matchesFns.length === 0) return sendError(404, 'Failed to find a function event for this request');
    const matchedFn = matchesFns[0];
    const { containerPort, name } = matchedFn;

    if (matchesFns.length > 1) {
      console.log(`[${id}] Found multiple function events for this request, selecting first...`, { name });
    }

    console.log(`[${id}] Proxying request to port ${containerPort}`);

    const urlToCall = `http://localhost:${containerPort}/2015-03-31/functions/myfunction/invocations`;
    const event = createApiGatewayProxyEvent(matchedFn, {
      headers, path, method, body, querystring,
    });

    const startDate = new Date();
    const upstreamResponse = await httpClient.post(urlToCall, { json: event }).json();

    const { statusCode, headers: resHeaders, body: resBody } = upstreamResponse;
    const requestDurationInMs = new Date() - startDate;
    console.log(`[${id}] Lambda responded with ${statusCode} status code and took ${requestDurationInMs} ms`);

    if (upstreamResponse.errorType === 'Error') {
      return sendError(502, upstreamResponse.errorMessage);
    }

    return res.writeHead(statusCode, resHeaders).end(resBody);
  }));
};

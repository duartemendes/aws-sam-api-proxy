import { join } from 'path';

const isServerlessFunction = ({ Type }) => Type === 'AWS::Serverless::Function';
const isApiEvent = ({ Type }) => Type.includes('Api');

const buildFnPathData = (path) => {
  const splittedPath = path.slice(1).split('/');
  const splittedData = splittedPath.map((part) => {
    const isParameter = part.startsWith('{');
    const data = isParameter ? part.replace(/{|}/g, '') : part;
    return { isParameter, data };
  });

  return {
    full: path,
    splitted: splittedData,
  };
};

export default (template, envVars, portOffset, basePath) => {
  const functionGlobals = template?.Globals?.Function ?? {};

  return Object.entries(template.Resources)
    // eslint-disable-next-line no-unused-vars
    .filter(([_, resource]) => isServerlessFunction(resource))
    .flatMap(([name, resource]) => Object.values(resource.Properties?.Events ?? {})
      .filter(isApiEvent)
      .map((ApiEvent, i, apiEvents) => [
        name + (apiEvents.length > 1 ? `_${i}` : ''),
        { ApiEvent, ...resource },
      ]))
    .reduce((result, [name, resource], i) => {
      const {
        Handler: handler = functionGlobals.Handler,
        Runtime: runtime = functionGlobals.Runtime,
        CodeUri: codeUri = functionGlobals.CodeUri,
        MemorySize: memorySize = functionGlobals.MemorySize,
        Timeout: timeout = functionGlobals.Timeout,
      } = resource.Properties;

      const { Type, Properties: { Path, Method, PayloadFormatVersion } } = resource.ApiEvent;

      return result.concat({
        name,
        handler,
        memorySize,
        timeout,
        event: {
          type: Type,
          payloadFormatVersion: PayloadFormatVersion,
        },
        path: buildFnPathData(Path),
        method: Method.toLowerCase(),
        containerPort: portOffset + i,
        environment: envVars[name] ?? {},
        dockerImageWithTag: `lambci/lambda:${runtime}`,
        distPath: join(basePath, codeUri),
      });
    }, []);
};

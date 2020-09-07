import { join } from 'path';

const isServerlessFunction = ({ Type }) => Type === 'AWS::Serverless::Function';
const isApiEvent = ({ Type }) => Type.includes('Api');

const resolveEnvValue = (refOverrides) => (val) => (typeof val === 'object' && 'Ref' in val ? refOverrides[val.Ref] || val.Ref : val);
const mapValues = (f, env) => Object.keys(env).reduce((curr, k) => ({
  ...curr,
  [k]: f(env[k]),
}), {});

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

export default (template, envVars, portOffset, basePath, refOverrides = {}) => {
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

      const environment = mapValues(
        resolveEnvValue(refOverrides),
        {
          ...functionGlobals.Environment?.Variables,
          ...resource.Properties.Environment?.Variables,
          ...envVars[name],
        },
      );

      return result.concat({
        name,
        handler,
        memorySize,
        timeout,
        environment,
        event: {
          type: Type,
          payloadFormatVersion: PayloadFormatVersion,
        },
        path: buildFnPathData(Path),
        method: Method.toLowerCase(),
        containerPort: portOffset + i,
        dockerImageWithTag: `lambci/lambda:${runtime}`,
        distPath: join(basePath, codeUri),
      });
    }, []);
};

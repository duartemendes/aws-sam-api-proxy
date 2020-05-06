import { join } from 'path';

const isServerlessFunction = ({ Type }) => Type === 'AWS::Serverless::Function';
const isApiEvent = ({ Type }) => Type.includes('Api');
const hasApiEvent = ({ Properties }) => Object.values(Properties?.Events ?? {}).some(isApiEvent);

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
    .filter(([_, resource]) => isServerlessFunction(resource) && hasApiEvent(resource))
    .reduce((result, [name, resource], i) => {
      const {
        Events, Handler, Runtime, CodeUri,
      } = resource.Properties;

      const runtime = Runtime ?? functionGlobals.Runtime;
      const codeUri = CodeUri ?? functionGlobals.CodeUri;
      const handler = Handler ?? functionGlobals.Handler;
      const apiEvent = Object.values(Events).find(isApiEvent);
      const { Type, Properties: { Path, Method, PayloadFormatVersion } } = apiEvent;

      return result.concat({
        name,
        handler,
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

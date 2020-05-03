const isServerlessFunction = ({ Type }) => Type === 'AWS::Serverless::Function';
const isApiEvent = ({ Type }) => Type.includes('Api');
const hasApiEvent = ({ Properties }) => Object.values(Properties?.Events ?? {}).some(isApiEvent);

const buildFnPathData = (path) => {
  const splittedPath = path.split('/');
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

export default (template, envVars, portOffset) => {
  const globalRuntime = template?.Globals?.Function?.Runtime;

  return Object.entries(template.Resources)
    .filter(([_, resource]) => isServerlessFunction(resource) && hasApiEvent(resource))
    .reduce((result, [name, resource], i) => {
      const { Events, Handler, Runtime } = resource.Properties;

      const apiEvent = Object.values(Events).find(isApiEvent);
      const { Type, Properties: { Path, Method, PayloadFormatVersion } } = apiEvent;
      const runtime = Runtime ?? globalRuntime;

      return result.concat({
        name,
        handler: Handler,
        event: {
          type: Type,
          payloadFormatVersion: PayloadFormatVersion,
        },
        path: buildFnPathData(Path.toLowerCase()),
        method: Method.toLowerCase(),
        containerPort: portOffset + i,
        environment: envVars[name] ?? {},
        dockerImageWithTag: `lambci/lambda:${runtime}`,
      });
    }, []);
};

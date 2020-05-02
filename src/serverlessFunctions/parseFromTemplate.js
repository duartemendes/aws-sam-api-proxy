const isApiEvent = ({ Type }) => Type.includes('Api');

const buildFnPathData = (path) => {
  const splittedPath = path.split('/');
  const splittedData = splittedPath.map((part) => {
    const isParameter = part.startsWith('{');
    const data = isParameter ? part.replace(/{|}/g, '') : part;
    return { isParameter, data }
  });

  return {
    full: path,
    splitted: splittedData,
  };
};

export default (template, envVars, portOffset) => {
  const globalRuntime = template?.Globals?.Function?.Runtime;

  return Object.entries(envVars).reduce((result, [functionName, environment], i) => {
    const resource = template.Resources[functionName];
    if (!resource) throw new Error(`Function with name "${functionName}" not found in SAM template`);

    const { Events, Handler, Runtime } = resource.Properties;

    const apiEvent = Object.values(Events).find(isApiEvent);
    if (!apiEvent) throw new Error(`Api event not found for function with name "${functionName}"`);

    const { Type, Properties: { Path, Method, PayloadFormatVersion } } = apiEvent;
    const runtime = Runtime ?? globalRuntime;

    return result.concat({
      name: functionName,
      handler: Handler,
      event: {
        type: Type,
        payloadFormatVersion: PayloadFormatVersion
      },
      path: buildFnPathData(Path.toLowerCase()),
      method: Method.toLowerCase(),
      containerPort: portOffset + i,
      environment,
      dockerImageWithTag: `lambci/lambda:${runtime}`,
    });
  }, []);
};
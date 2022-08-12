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

const buildLayersConfig = (basePath, templatePath, template, prelimLayers) => {
  const config = [];

  if (prelimLayers && prelimLayers.length > 0) {
    prelimLayers.forEach((layer) => {
      if (!('Ref' in layer)) throw new Error('Only referenced layers are supported.');

      const layerName = layer.Ref;
      const cftLayer = template.Resources[layerName];
      const layerContentUri = cftLayer.Properties.ContentUri;
      const hostSource = join(basePath, templatePath, '../', layerContentUri);
      const layerConfig = {
        hostSource,
        containerDestination: '/opt',
      };

      config.push(layerConfig);
    });
  }

  return config;
};

export default (
  template,
  templatePath,
  envVars,
  portOffset,
  basePath,
  refOverrides = {},
  portIncrement = 1,
  baseImageRepo = 'lambci/lambda',
) => {
  const functionGlobals = template?.Globals?.Function ?? {};

  return Object.entries(template.Resources)
    // eslint-disable-next-line no-unused-vars
    .filter(([_, resource]) => isServerlessFunction(resource))
    .flatMap(([name, resource]) => Object.values(resource.Properties?.Events ?? {})
      .filter(isApiEvent)
      .map((ApiEvent, i, apiEvents) => [
        name + (apiEvents.length > 1 ? `_${i}` : ''),
        { ApiEvent, functionName: name, ...resource },
      ]))
    .reduce((result, [name, resource], i) => {
      const {
        Handler: handler = functionGlobals.Handler,
        Runtime: runtime = functionGlobals.Runtime,
        CodeUri: codeUri = functionGlobals.CodeUri,
        MemorySize: memorySize = functionGlobals.MemorySize,
        Timeout: timeout = functionGlobals.Timeout,
        Layers: prelimLayers = functionGlobals.Layers,
      } = resource.Properties;

      const { Type, Properties: { Path, Method, PayloadFormatVersion } } = resource.ApiEvent;

      const environment = mapValues(
        resolveEnvValue(refOverrides),
        {
          ...functionGlobals.Environment?.Variables,
          ...resource.Properties.Environment?.Variables,
          ...envVars[resource.functionName],
        },
      );

      const layers = buildLayersConfig(basePath, templatePath, template, prelimLayers);

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
        containerPort: portOffset + i * portIncrement,
        dockerImageWithTag: `${baseImageRepo}:${runtime}`,
        distPath: join(basePath, templatePath, '../', codeUri),
        layers,
      });
    }, []);
};

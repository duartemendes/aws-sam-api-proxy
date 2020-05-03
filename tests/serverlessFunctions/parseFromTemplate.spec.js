import { parseFunctionsFromTemplate } from '../../src/serverlessFunctions';

describe('parseFromTemplate', () => {
  const envVars = {
    GetSomething: {
      DB_NAME: 'my_database',
    },
  };
  const portOffset = 3001;

  it('should ignore resources that are not serverless functions', () => {
    const template = {
      Resources: {
        DLQueue: {
          Type: 'AWS::SQS::Queue',
        },
      },
    };

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset);

    expect(functions).toEqual([]);
  });

  it('should ignore functions without api events', () => {
    const template = {
      Resources: {
        ProcessFromSQS: {
          Type: 'AWS::SQS::Queue',
          Properties: {
            Events: {
              ProcessFromSQSEvent: {
                Type: 'SQS',
                Properties: {
                  Queue: 'GetAtt DLQueue.Arn',
                },
              },
            },
          },
        },
      },
    };

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset);

    expect(functions).toEqual([]);
  });

  it('should return expected function data', () => {
    const template = {
      Resources: {
        GetSomething: {
          Type: 'AWS::Serverless::Function',
          Properties: {
            CodeUri: './dist',
            Handler: 'GetSomethingHandler.default',
            Runtime: 'nodejs12.x',
            Events: {
              GetSomethingEvent: {
                Type: 'Api',
                Properties: {
                  Path: '/resources/{resourceId}/sub-resource/{subResourceId}/something',
                  Method: 'GET',
                },
              },
            },
          },
        },
      },
    };

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset);

    expect(functions).toHaveLength(1);
    expect(functions[0]).toEqual({
      name: 'GetSomething',
      handler: 'GetSomethingHandler.default',
      event: {
        type: 'Api',
        payloadFormatVersion: undefined,
      },
      path: {
        full: '/resources/{resourceId}/sub-resource/{subResourceId}/something',
        splitted: [
          {
            isParameter: false,
            data: 'resources',
          },
          {
            isParameter: true,
            data: 'resourceId',
          },
          {
            isParameter: false,
            data: 'sub-resource',
          },
          {
            isParameter: true,
            data: 'subResourceId',
          },
          {
            isParameter: false,
            data: 'something',
          },
        ],
      },
      method: 'get',
      containerPort: portOffset,
      environment: envVars.GetSomething,
      dockerImageWithTag: 'lambci/lambda:nodejs12.x',
    });
  });

  it('should return functions with Api and HttpApi events', () => {
    const template = {
      Resources: {
        GetResources: {
          Type: 'AWS::Serverless::Function',
          Properties: {
            CodeUri: './dist',
            Handler: 'GetResourcesHandler.default',
            Runtime: 'nodejs12.x',
            Events: {
              GetResourcesEvent: {
                Type: 'Api',
                Properties: {
                  Path: '/resources',
                  Method: 'GET',
                },
              },
            },
          },
        },
        GetResourceById: {
          Type: 'AWS::Serverless::Function',
          Properties: {
            CodeUri: './dist',
            Handler: 'GetResourceByIdHandler.default',
            Runtime: 'nodejs12.x',
            Events: {
              GetResourceByIdEvent: {
                Type: 'HttpApi',
                Properties: {
                  Path: '/resources/{id}',
                  Method: 'GET',
                },
              },
            },
          },
        },
      },
    };

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset);

    expect(functions).toHaveLength(2);
  });

  it('should fallback to global runtime when function is missing it', () => {
    const template = {
      Globals: {
        Function: {
          Runtime: 'nodejs10.x',
        },
      },
      Resources: {
        GetResources: {
          Type: 'AWS::Serverless::Function',
          Properties: {
            CodeUri: './dist',
            Handler: 'GetResourcesHandler.default',
            Events: {
              GetResourcesEvent: {
                Type: 'Api',
                Properties: {
                  Path: '/resources',
                  Method: 'GET',
                },
              },
            },
          },
        },
      },
    };

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset);

    expect(functions[0].dockerImageWithTag).toEqual('lambci/lambda:nodejs10.x');
  });

  it('should provide payloadFormatVersion when event is of type HttpApi', () => {
    const template = {
      Resources: {
        GetResourceById: {
          Type: 'AWS::Serverless::Function',
          Properties: {
            CodeUri: './dist',
            Handler: 'GetResourceByIdHandler.default',
            Runtime: 'nodejs12.x',
            Events: {
              GetResourceByIdEvent: {
                Type: 'HttpApi',
                Properties: {
                  Path: '/resources/{id}',
                  Method: 'GET',
                  PayloadFormatVersion: '2.0',
                },
              },
            },
          },
        },
      },
    };

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset);

    expect(functions[0].event.payloadFormatVersion).toEqual('2.0');
  });
});

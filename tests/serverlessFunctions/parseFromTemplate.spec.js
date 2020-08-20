import { parseFunctionsFromTemplate } from '../../src/serverlessFunctions';

describe('parseFromTemplate()', () => {
  const envVars = {
    GetSomething: {
      DB_NAME: 'my_database',
    },
  };
  const portOffset = 3001;
  const basePath = '/Users/foo/api';

  it('should ignore resources that are not serverless functions', () => {
    const template = {
      Resources: {
        DLQueue: {
          Type: 'AWS::SQS::Queue',
        },
      },
    };

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset, basePath);

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

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset, basePath);

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
            MemorySize: 256,
            Timeout: 10,
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

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset, basePath);

    expect(functions).toHaveLength(1);
    expect(functions[0]).toEqual({
      name: 'GetSomething',
      handler: 'GetSomethingHandler.default',
      memorySize: 256,
      timeout: 10,
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
      distPath: '/Users/foo/api/dist',
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

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset, basePath);

    expect(functions).toHaveLength(2);
  });

  it('should fallback to globals when function is missing properties', () => {
    const template = {
      Globals: {
        Function: {
          Runtime: 'nodejs10.x',
          CodeUri: './dist',
          Handler: 'GetResourcesHandler.default',
          MemorySize: 256,
          Timeout: 10,
        },
      },
      Resources: {
        GetResources: {
          Type: 'AWS::Serverless::Function',
          Properties: {
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

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset, basePath);

    expect(functions[0]).toMatchObject({
      dockerImageWithTag: 'lambci/lambda:nodejs10.x',
      distPath: '/Users/foo/api/dist',
      handler: 'GetResourcesHandler.default',
      memorySize: 256,
      timeout: 10,
    });
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

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset, basePath);

    expect(functions[0].event.payloadFormatVersion).toEqual('2.0');
  });

  it('should return functions with multiple events', () => {
    const template = {
      Resources: {
        Greeting: {
          Type: 'AWS::Serverless::Function',
          Properties: {
            CodeUri: './dist',
            Handler: 'GreetHandler.default',
            Runtime: 'nodejs12.x',
            Events: {
              APIWithName: {
                Type: 'Api',
                Properties: {
                  Path: '/hello/byname/{name}',
                  Method: 'GET',
                },
              },
              APIAnonymous: {
                Type: 'Api',
                Properties: {
                  Path: '/hello',
                  Method: 'GET',
                },
              },
            },
          },
        },
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
      },
    };

    const functions = parseFunctionsFromTemplate(template, envVars, portOffset, basePath);

    expect(functions).toMatchObject([
      { name: 'Greeting_0', containerPort: 3001, handler: 'GreetHandler.default' },
      { name: 'Greeting_1', containerPort: 3002, handler: 'GreetHandler.default' },
      { name: 'GetResources', containerPort: 3003, handler: 'GetResourcesHandler.default' },
    ]);
  });

  it('should resolve Refs in function environments', () => {
    const template = {
      Globals: {
        Function: {
          Environment: {
            Variables: {
              GLOBAL_TOKEN_1: 'global_tok_one',
              GLOBAL_TOKEN_2: { Ref: 'GlobalParameterTwo' },
              GLOBAL_TOKEN_3: { Ref: 'GlobalAbsentParameter' },
              OVERRIDDEN_TOKEN: 'global',
            },
          },
        },
      },
      Resources: {
        GetSomething: {
          Type: 'AWS::Serverless::Function',
          Properties: {
            CodeUri: './dist',
            Handler: 'GetSomethingHandler.default',
            Runtime: 'nodejs12.x',
            MemorySize: 256,
            Timeout: 10,
            Environment: {
              Variables: {
                LOCAL_TOKEN_1: 'local_tok_one',
                LOCAL_TOKEN_2: { Ref: 'LocalParameterTwo' },
                LOCAL_TOKEN_3: { Ref: 'LocalAbsentParameter' },
                OVERRIDDEN_TOKEN: 'local',
              },
            },
            Events: {
              GetSomethingEvent: {
                Type: 'Api',
                Properties: {
                  Path: '/resource',
                  Method: 'GET',
                },
              },
            },
          },
        },
      },
    };

    const vars = {
      GetSomething: {
        ENVVAR_TOKEN_1: 'envVar_tok_one',
        ENVVAR_TOKEN_2: { Ref: 'EnvVarParameterTwo' },
        ENVVAR_TOKEN_3: { Ref: 'EnvVarAbsentParameter' },
        OVERRIDDEN_TOKEN: 'envVar',
      },
    };

    const parameters = {
      EnvVarParameterTwo: 'envVar_tok_two',
      LocalParameterTwo: 'local_tok_two',
      GlobalParameterTwo: 'global_tok_two',
    };

    const functions = parseFunctionsFromTemplate(template, vars, portOffset, basePath, parameters);

    expect(functions).toMatchObject([
      {
        name: 'GetSomething',
        containerPort: 3001,
        handler: 'GetSomethingHandler.default',
        environment: {
          ENVVAR_TOKEN_1: 'envVar_tok_one',
          ENVVAR_TOKEN_2: 'envVar_tok_two',
          GLOBAL_TOKEN_1: 'global_tok_one',
          GLOBAL_TOKEN_2: 'global_tok_two',
          LOCAL_TOKEN_1: 'local_tok_one',
          LOCAL_TOKEN_2: 'local_tok_two',
          OVERRIDDEN_TOKEN: 'envVar',
        },
      },
    ]);
  });
});

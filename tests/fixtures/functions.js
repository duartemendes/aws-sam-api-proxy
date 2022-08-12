export default [
  {
    method: 'get',
    path: {
      full: '/resources',
      splitted: [
        {
          isParameter: false,
          data: 'resources',
        },
      ],
    },
    containerPort: 3001,
    environment: {},
    dockerImageWithTag: 'lambci/lambda:nodejs12.x',
    layers: [],
  },
  {
    event: {
      type: 'Api',
    },
    method: 'get',
    path: {
      full: '/resources/{id}',
      splitted: [
        {
          isParameter: false,
          data: 'resources',
        },
        {
          isParameter: true,
          data: 'id',
        },
      ],
    },
    containerPort: 3002,
    environment: {},
    dockerImageWithTag: 'lambci/lambda:nodejs12.x',
    layers: [],
  },
  {
    method: 'post',
    path: {
      full: '/resources',
      splitted: [
        {
          isParameter: false,
          data: 'resources',
        },
      ],
    },
    containerPort: 3003,
    environment: {},
    dockerImageWithTag: 'lambci/lambda:nodejs10.x',
  },
  {
    method: 'put',
    path: {
      full: '/resources/{id}',
      splitted: [
        {
          isParameter: false,
          data: 'resources',
        },
        {
          isParameter: true,
          data: 'id',
        },
      ],
    },
    containerPort: 3004,
    environment: {},
    dockerImageWithTag: 'lambci/lambda:nodejs10.x',
    layers: [],
  },
  {
    method: 'any',
    path: {
      full: '/other-resource/{proxy+}',
      splitted: [
        {
          isParameter: false,
          data: 'other-resource',
        },
        {
          isParameter: true,
          data: 'proxy+',
        },
      ],
    },
    containerPort: 3005,
    environment: {},
    dockerImageWithTag: 'lambci/lambda:nodejs10.x',
    layers: [],
  },
];

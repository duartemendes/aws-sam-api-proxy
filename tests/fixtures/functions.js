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
    containerPort: 3002,
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
    containerPort: 3003,
    environment: {},
    dockerImageWithTag: 'lambci/lambda:nodejs10.x',
  },
];

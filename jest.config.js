module.exports = {
  transform: {
    '^.+\\.js?$': 'babel-jest',
  },
  moduleFileExtensions: ['js'],
  rootDir: process.cwd(),
  testEnvironment: 'node',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js',
  ],
};

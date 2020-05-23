import { matchFunctionsAgainstRequest } from '../../src/serverlessFunctions';
import functions from '../fixtures/functions';

describe('matchFunctionAgainstRequest()', () => {
  it('should return no matches when there are no functions with given method', () => {
    const request = {
      path: '/resources/1',
      method: 'DELETE',
    };

    const matchedFunctions = matchFunctionsAgainstRequest(functions, request);

    expect(matchedFunctions).toEqual([]);
  });

  it('should return no matches when there are no functions with given path', () => {
    const request = {
      path: '/something',
      method: 'GET',
    };

    const matchedFunctions = matchFunctionsAgainstRequest(functions, request);

    expect(matchedFunctions).toEqual([]);
  });

  it('should return match when there is a function for given method and path', () => {
    const request = {
      path: '/resources/1',
      method: 'GET',
    };

    const matchedFunctions = matchFunctionsAgainstRequest(functions, request);

    expect(matchedFunctions).toEqual([functions[1]]);
  });

  it('should return all matches when there are multiple functions for given method and path', () => {
    const request = {
      path: '/resources',
      method: 'GET',
    };

    const matchedFunctions = matchFunctionsAgainstRequest(functions.concat(functions[0]), request);

    expect(matchedFunctions).toHaveLength(2);
  });

  it('should return match when there is a function for given path with ANY method', () => {
    const request = {
      path: '/other-resource/sub-resource',
      method: 'TRACE',
    };

    const matchedFunctions = matchFunctionsAgainstRequest(functions, request);

    expect(matchedFunctions).toEqual([functions[4]]);
  });
});

import { buildFromRawHeaders } from '../../src/request/headers';

describe('headers', () => {
  describe('buildFromRawHeaders()', () => {
    it('should return object with key values from request raw headers', () => {
      const rawHeaders = [
        'Content-Length', '123456',
        'Connection', 'keep-alive',
        'Host', 'mysite.com',
        'Accept', '*/*',
      ];

      const headers = buildFromRawHeaders(rawHeaders);

      expect(headers).toEqual({
        'Content-Length': '123456',
        Connection: 'keep-alive',
        Host: 'mysite.com',
        Accept: '*/*',
      });
    });
  });
});

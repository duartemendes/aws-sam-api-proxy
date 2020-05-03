// eslint-disable-next-line import/prefer-default-export
export const buildFromRawHeaders = (rawHeaders) => rawHeaders.reduce((result, current, i) => {
  if (i % 2 === 0) {
    // eslint-disable-next-line no-param-reassign
    result[current] = rawHeaders[i + 1];
  }
  return result;
}, {});

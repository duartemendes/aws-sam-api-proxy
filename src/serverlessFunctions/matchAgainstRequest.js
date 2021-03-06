export default (functions, { path, method }) => functions.filter((fn) => {
  if (fn.method !== 'any' && fn.method !== method.toLowerCase()) return false;

  const splittedPath = path.slice(1).split('/');
  if (fn.path.splitted.length !== splittedPath.length) return false;

  return fn.path.splitted.every(
    ({ isParameter, data }, i) => isParameter || data === splittedPath[i],
  );
});

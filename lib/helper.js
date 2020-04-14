function trimNewLine(input) {
  return typeof (input) === 'string' ? input.replace(/\n/g, '') : input;
}

function get(object, path) {
  const pathArray = path.split('.');
  let result = object;
  while (pathArray.length) {
    const pathItem = pathArray.shift();
    if (pathItem in result) {
      result = result[pathItem];
    } else {
      return undefined;
    }
  }
  return result;
}

function last(array) {
  const length = array == null ? 0 : array.length;
  return length ? array[length - 1] : undefined;
}

function fromCallback(func) {
  return new Promise(
    (resolve, reject) => func((err, result) => (err ? reject(err) : resolve(result))),
  );
}

async function findAsync(promises) {
  let foundResult;
  await promises.reduce(
    (resultPromise, promise) => resultPromise.then((result) => {
      if (!foundResult) {
        if (result) {
          foundResult = result;
        } else {
          return promise.then();
        }
      }
      return undefined;
    }),
    Promise.resolve(),
  );
  return foundResult;
}

module.exports = {
  findAsync,
  fromCallback,
  get,
  last,
  trimNewLine,
};

export const multiRequest = function (
  reqs: (() => Promise<any>)[],
  limit: number
): Promise<any[]> {
  return new Promise((resolve) => {
    const results: any[] = [];
    function* gen() {
      for (let i = 0; i < reqs.length; i++) {
        yield reqs[i]();
      }
    }
    const g = gen();
    function next() {
      const { value, done } = g.next();
      if (done) return;
      value.then(() => {
        results.push(value);
        if (results.length === reqs.length) {
          resolve(results);
        }
        next();
      });
    }
    for (let i = 0; i < limit; i++) {
      next();
    }
  });
};

import fs from "fs";
import path from "path";

async function asyncChunk(chunkStream: fs.ReadStream): Promise<{
  code: 0 | 1;
}> {
  return new Promise((resolve, reject) => {
    chunkStream.on("end", () => {
      resolve({
        code: 0,
      });
    });
    chunkStream.on("error", (err) => {
      reject({
        code: 1,
        msg: err,
      });
    });
  });
}

export const streamMerge = function (
  chunkDir: string,
  fileWriteStream: fs.WriteStream
) {
  const chunks = fs.readdirSync(chunkDir).sort((a, b) => {
    a = a.split("_").pop();
    b = b.split("_").pop();
    return Number(a) - Number(b);
  });

  return new Promise<{
    code: 0 | 1;
  }>(async (resolve, reject) => {
    while (chunks.length > 0) {
      const chunk = chunks.shift();
      const chunkPath = path.resolve(chunkDir, chunk);

      const chunkStream = fs.createReadStream(chunkPath);

      chunkStream.pipe(fileWriteStream, { end: false });
      const res = await asyncChunk(chunkStream);
      if (res.code === 1) {
        reject(res);
      }
    }
    resolve({
      code: 0,
    });
    fileWriteStream.end();
  });
};

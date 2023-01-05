import SparkMD5 from "spark-md5";

export interface IFileChunk {
  chunk: Blob;
  hash: string; // 文件hash值
  index: number; // 文件切片索引
  complete?: boolean;
}

// 计算文件hash值
export const getHash = (
  file: File,
  SIZE: number,
  cb?: (progress: number) => void
): Promise<{
  code: number;
  hash?: string;
  message?: string;
}> => {
  const blobSlice = File.prototype.slice;
  const chunkSize = SIZE;
  const chunks = Math.ceil(file.size / chunkSize);
  let currentChunk = 0;
  const spark = new SparkMD5.ArrayBuffer();
  const fileReader = new FileReader();

  function loadNext() {
    var start = currentChunk * chunkSize,
      end = start + chunkSize >= file.size ? file.size : start + chunkSize;
    fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
  }

  const promise = new Promise<{
    code: number;
    hash?: string;
    message?: string;
  }>((resolve) => {
    fileReader.onload = function (e) {
      const progress = ((currentChunk + 1) / chunks) * 100;
      console.log(progress);
      cb?.(progress);

      console.log("read chunk nr", currentChunk + 1, "of", chunks);
      spark.append(e.target!.result as ArrayBuffer); // Append array buffer
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        console.log("finished loading");
        const hash = spark.end();
        console.info("computed hash", hash); // Compute hash
        resolve({ code: 1, hash });
      }
    };

    fileReader.onerror = function () {
      console.warn("oops, something went wrong.");
      resolve({ code: 0, message: "oops, something went wrong." });
    };
  });

  loadNext();

  return promise;
};

// 切割文件
export const createFileChunk = <T = IFileChunk>(
  file: File & {
    hash?: string;
  },
  hash: string,
  size: number,
  cb: (file: Blob, index?: number) => T = (blob: Blob, index) => {
    return {
      chunk: blob,
      hash: hash + "_" + index,
      index: index,
    } as T;
  }
): T[] => {
  const chunks = [];
  const totalSize = file.size;
  let cur = 0;
  while (cur < totalSize) {
    chunks.push(cb(file.slice(cur, cur + size), cur / size));
    cur += size;
  }
  return chunks;
};

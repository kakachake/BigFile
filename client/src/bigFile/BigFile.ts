import { getHash, IFileChunk } from "./utils";
import { createFileChunk } from "./utils";

interface Hooks {
  onHashProgress?: ((progress: number) => void)[];
  onHashCompleted?: ((hash: string) => void)[];
}

interface FileChunkSize {
  chunkSize: number;
  hashSize: number;
}

interface BigFileOptions {
  size: FileChunkSize;
  hooks?: {
    onHashProgress?: (progress: number) => void;
    onHashCompleted?: (hash: string) => void;
  };
}

const defalutOptions = {
  size: {
    chunkSize: 1024 * 1024 * 20,
    hashSize: 1024 * 1024 * 20,
  },
};

export class BigFile {
  file: File;
  // 分片大小
  size: FileChunkSize;
  hooks: Hooks;
  hash: string = "";
  // 分片结果缓存
  chunks?: IFileChunk[];
  hashPromise?: Promise<string>;

  constructor(file: File, userOptions: Partial<BigFileOptions>) {
    const options: BigFileOptions = { ...defalutOptions, ...userOptions };
    const { size, hooks } = options;
    this.file = file;
    this.size = size;
    this.hooks = {
      onHashProgress: hooks?.onHashProgress
        ? (<any>[]).concat(hooks.onHashProgress)
        : [],
      onHashCompleted: hooks?.onHashCompleted
        ? (<any[]>[]).concat(hooks.onHashCompleted)
        : [],
    };

    this.calcHash();
  }

  async calcHash() {
    return (this.hashPromise = new Promise<string>(async (resolve, reject) => {
      try {
        const {
          file,
          size: { hashSize },
        } = this;
        const hashRes = await getHash(file, hashSize, (progress) => {
          this.hooks.onHashProgress?.forEach((cb) => cb(progress));
        });
        this.hash = hashRes.hash || "";
        this.hooks.onHashCompleted?.forEach((cb) => cb(this.hash));
        resolve(this.hash || "");
      } catch (error) {
        reject(error);
      }
    }));
  }

  async createChunks() {
    return (
      this.hashPromise?.then((hash) => {
        const {
          file,
          size: { chunkSize },
        } = this;
        this.chunks = createFileChunk(file, hash, chunkSize);
        return this.chunks;
      }) || Promise.reject("chunks not created")
    );
  }

  async getChunks() {
    return this.chunks || (await this.createChunks());
  }
}

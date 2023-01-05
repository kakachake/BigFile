var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_express = __toESM(require("express"));
var import_body_parser = __toESM(require("body-parser"));
var import_multiparty = __toESM(require("multiparty"));
var import_path2 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var import_fs_extra = __toESM(require("fs-extra"));

// src/utils.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
async function asyncChunk(chunkStream) {
  return new Promise((resolve, reject) => {
    chunkStream.on("end", () => {
      resolve({
        code: 0
      });
    });
    chunkStream.on("error", (err) => {
      reject({
        code: 1,
        msg: err
      });
    });
  });
}
var streamMerge = function(chunkDir, fileWriteStream) {
  const chunks = import_fs.default.readdirSync(chunkDir).sort((a, b) => {
    a = a.split("_").pop();
    b = b.split("_").pop();
    return Number(a) - Number(b);
  });
  return new Promise(async (resolve, reject) => {
    while (chunks.length > 0) {
      const chunk = chunks.shift();
      const chunkPath = import_path.default.resolve(chunkDir, chunk);
      const chunkStream = import_fs.default.createReadStream(chunkPath);
      chunkStream.pipe(fileWriteStream, { end: false });
      const res = await asyncChunk(chunkStream);
      if (res.code === 1) {
        reject(res);
      }
    }
    resolve({
      code: 0
    });
    fileWriteStream.end();
  });
};

// src/index.ts
var app = (0, import_express.default)();
var UPLOAD_DIR = import_path2.default.resolve(process.cwd(), "./upload");
var getFileDir = (filename, hash) => {
  return "chunk-" + hash.slice(0, 5) + filename.split(".")[0];
};
app.all("*", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});
app.use("/files", import_express.default.static(import_path2.default.resolve(UPLOAD_DIR, "file")));
app.use(import_body_parser.default.urlencoded({ extended: false }));
app.use(import_body_parser.default.json());
app.get("/", (req, res) => {
  res.send("\u5927\u6587\u4EF6\u4E0A\u4F20\u670D\u52A1\u542F\u52A8\u6210\u529F\uFF01");
});
app.post("/upload", (req, res) => {
  try {
    const form = new import_multiparty.default.Form({});
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.log(err);
        return;
      }
      const [chunk] = files.chunk;
      const [hash] = fields.hash;
      const [filename] = fields.filename;
      const { path: oldPath } = chunk;
      const chunkDir = import_path2.default.resolve(
        UPLOAD_DIR,
        "temp",
        getFileDir(filename, hash)
      );
      if (!import_fs_extra.default.existsSync(chunkDir)) {
        import_fs_extra.default.mkdirSync(chunkDir);
      }
      import_fs_extra.default.moveSync(oldPath, `${chunkDir}/${hash}`, {
        overwrite: true
      });
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.send({ code: 200, msg: "\u4E0A\u4F20\u6210\u529F", hash });
    });
  } catch (error) {
    res.status(500);
    res.setHeader("Content-Type", "application/json");
    res.send({ code: 500, msg: "\u4E0A\u4F20\u5931\u8D25", error });
  }
});
app.post("/merge", async (req, res) => {
  console.log("merge");
  const { filename, hash } = req.body;
  const dirName = getFileDir(filename, hash);
  const fileType = filename.split(".").pop();
  const mergeName = `${hash}.${fileType}`;
  const fileWriteStream = import_fs2.default.createWriteStream(
    import_path2.default.resolve(UPLOAD_DIR, "file", mergeName)
  );
  const chunksdir = import_path2.default.resolve(UPLOAD_DIR, "temp", dirName);
  const mergeRes = await streamMerge(chunksdir, fileWriteStream);
  if (mergeRes.code === 0) {
    import_fs_extra.default.removeSync(chunksdir);
  }
  res.status(200);
  res.setHeader("Content-Type", "application/json");
  res.send({ code: 200, msg: "\u5408\u5E76\u6210\u529F", filename: mergeName });
});
app.listen(3e3, () => {
  console.log("Server is running on port 3000");
});

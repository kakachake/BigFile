import express from "express";
import bodyParser from "body-parser";
import multiparty from "multiparty";
import path from "path";
import fs from "fs";
import fse from "fs-extra";
import { streamMerge } from "./utils";

const app = express();

const UPLOAD_DIR = path.resolve(process.cwd(), "./upload"); // 上传文件目录

const getFileDir = (filename: string, hash: string) => {
  return "chunk-" + hash.slice(0, 5) + filename.split(".")[0];
};

// 设置header
app.all("*", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

app.use("/files", express.static(path.resolve(UPLOAD_DIR, "file")));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("大文件上传服务启动成功！");
});

app.post("/upload", (req, res) => {
  try {
    const form = new multiparty.Form({});
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.log(err);
        return;
      }
      const [chunk] = files.chunk;
      const [hash] = fields.hash;
      const [filename] = fields.filename;
      const { path: oldPath } = chunk;

      const chunkDir = path.resolve(
        UPLOAD_DIR,
        "temp",
        getFileDir(filename, hash)
      );
      if (!fse.existsSync(chunkDir)) {
        fse.mkdirSync(chunkDir);
      }
      fse.moveSync(oldPath as string, `${chunkDir}/${hash}`, {
        overwrite: true,
      });
      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.send({ code: 200, msg: "上传成功", hash });
    });
  } catch (error) {
    res.status(500);
    res.setHeader("Content-Type", "application/json");
    res.send({ code: 500, msg: "上传失败", error });
  }
});

app.post("/merge", async (req, res) => {
  console.log("merge");
  const { filename, hash } = req.body;
  const dirName = getFileDir(filename, hash);
  const fileType = filename.split(".").pop();
  const mergeName = `${hash}.${fileType}`;
  const fileWriteStream = fs.createWriteStream(
    path.resolve(UPLOAD_DIR, "file", mergeName)
  );
  const chunksdir = path.resolve(UPLOAD_DIR, "temp", dirName);
  const mergeRes = await streamMerge(chunksdir, fileWriteStream);
  if (mergeRes.code === 0) {
    fse.removeSync(chunksdir);
  }
  res.status(200);
  res.setHeader("Content-Type", "application/json");
  res.send({ code: 200, msg: "合并成功", filename: mergeName });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

import { ChangeEvent, useRef, useState } from "react";
import "./App.css";
import { multiRequest } from "./utils";
import { IFileChunk } from "./bigFile/utils";
import axios from "axios";
import ProgressGroup from "./ProgressGroup";
import Progress from "./Progress";
import { BigFile } from "./bigFile/BigFile";
import { message } from "antd";

function App() {
  const [messageApi, contextHolder] = message.useMessage();

  const bigFileRef = useRef<BigFile>();

  const [completeFileName, setCompleteFileName] = useState<string>("");

  const controller = useRef<AbortController>();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const [file] = e.target.files ?? [];
    if (file) {
      bigFileRef.current = new BigFile(file, {
        hooks: {
          onHashProgress: (progress: number) => {
            setHashProgress(progress);
          },
        },
      });
    }
  };

  const createFormData = function (data: IFileChunk, fileName: string) {
    const formData = new FormData();
    formData.append("chunk", data.chunk);
    formData.append("hash", data.hash);
    formData.append("filename", fileName);
    return formData;
  };

  const uploadChunks = async function (
    chunks: IFileChunk[],
    fileName: string,
    hash: string
  ) {
    controller.current = new AbortController();
    const progresses: number[] = new Array(chunks.length).fill(0);
    setProgresses(progresses);
    const formDatas = chunks
      .filter((chunk) => {
        if (chunk.complete) {
          progresses[chunk.index] = 100;
        }
        return !chunk.complete;
      })
      .map((chunk) => {
        return {
          formData: createFormData(chunk, fileName),
          index: chunk.index,
        };
      });

    const reqs = formDatas.map((item, index) => {
      return axios.post.bind(
        null,
        "http://localhost:3000/upload",
        item.formData,
        {
          onUploadProgress: (e) => {
            const total = e.total;
            const progress =
              (total && Math.round((e.loaded * 100) / total)) || 0;
            const idx = item.index;
            progresses[idx] = progress;
            setProgresses([...progresses]);
            if (progress === 100) {
              chunks[idx].complete = true;
            }
          },
          signal: controller.current!.signal,
        }
      );
    });

    await multiRequest(reqs, 10);
    const ms = messageApi.open({
      type: "loading",
      content: "正在合并chunk文件..",
      duration: 0,
    });
    await mergeChunk(hash, fileName);
    messageApi.destroy();
    message.success("合并成功", 1);
  };

  const mergeChunk = async (hash: string, filename: string) => {
    await axios
      .post("http://localhost:3000/merge", {
        hash,
        filename,
      })
      .then((res) => {
        const { data } = res;
        if (data.code === 200) {
          setCompleteFileName(data.filename);
        }
      });
  };

  const handleUpload = async () => {
    const bigFile = bigFileRef.current!;
    bigFile.getChunks().then(async (chunks) => {
      console.log(chunks);

      await uploadChunks(chunks, bigFile.file.name, bigFile.hash);
    });
  };

  const handleStop = () => {
    controller.current?.abort();
  };
  const clear = () => {
    setHashProgress(0);
    setProgresses([]);
    inputRef.current!.value = "";
    inputRef.current!.files = null;
  };

  const [progresses, setProgresses] = useState<number[]>([]);
  const [hashProgress, setHashProgress] = useState<number>(0);

  return (
    <div>
      <input ref={inputRef} type="file" onChange={handleChange} />
      <button onClick={handleUpload}>上传</button>
      <button onClick={handleStop}>暂停</button>
      <button onClick={clear}>清除</button>
      <div>
        hash计算进度：
        <Progress
          style={{
            backgroundColor: "blue",
          }}
          progress={hashProgress}
        />
      </div>
      <div>
        上传进度：
        <ProgressGroup progresses={progresses}></ProgressGroup>
      </div>
      {completeFileName && (
        <div>
          打开地址：
          <a
            href={"http://localhost:3000/files/" + completeFileName}
            target="_blank"
          >
            {bigFileRef.current?.file.name}
          </a>
        </div>
      )}
      {contextHolder}
    </div>
  );
}

export default App;

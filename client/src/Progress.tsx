import { CSSProperties } from "react";

export default function Progress(props: {
  progress: number;
  style?: CSSProperties;
}) {
  return (
    <div className="progressWrap">
      <div
        style={{
          width: `${props.progress}%`,
          ...props.style,
        }}
        className="progress"
      ></div>
    </div>
  );
}

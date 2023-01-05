import Progress from "./Progress";

export default function ProgressGroup({
  progresses,
}: {
  progresses: number[];
}) {
  return (
    <div className="progressGroup">
      {progresses.map((item, index) => {
        return <Progress progress={item} key={index}></Progress>;
      })}
    </div>
  );
}

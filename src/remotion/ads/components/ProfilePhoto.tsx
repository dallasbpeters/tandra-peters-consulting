import { Img } from "remotion";

interface ProfilePhotoProps {
  width: number;
  height: number;
  src: string;
}

export function ProfilePhoto({ width, height, src }: ProfilePhotoProps) {
  return (
    <Img
      src={src}
      alt="Profile Photo"
      style={{
        width,
        height,
        borderRadius: 9999,
        border: "4px solid var(--color-paper-dark)",
        overflow: "hidden",
        marginBlockEnd: 40,
      }}
    />
  );
}

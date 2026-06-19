import { Img } from "remotion";

interface ProfilePhotoProps {
  height: number;
  src: string;
  width: number;
}

export function ProfilePhoto({ width, height, src }: ProfilePhotoProps) {
  return (
    <Img
      alt="Profile Photo"
      src={src}
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

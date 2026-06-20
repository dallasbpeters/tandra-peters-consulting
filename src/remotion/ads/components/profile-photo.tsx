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
        border: "4px solid var(--color-paper-dark)",
        borderRadius: 9999,
        height,
        marginBlockEnd: 40,
        overflow: "hidden",
        width,
      }}
    />
  );
}

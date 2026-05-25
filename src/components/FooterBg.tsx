import React from "react";
import { Shader, Dither, ImageTexture } from "shaders/react";

export default function FooterBg({ style }: { style: React.CSSProperties }) {
  return (
    <Shader style={style}>
      <Dither
        blendMode="normal-oklch"
        colorA="#050a05"
        colorB="#183A2C"
        pixelSize={2}
        threshold={0.4}
        transform={{
          anchorX: 0.62,
          anchorY: 0.49,
          scale: 1.07,
        }}
      >
        <ImageTexture
          objectFit="cover"
          transform={{
            scale: 2,
          }}
          url="https://data.shaders.com/storage/v1/object/public/user-uploaded-images/user_3E93x1BOQFIvRduMb5kBj66tBhe/YVOAZdT5J5N6.jpg"
        />
      </Dither>
    </Shader>
  );
}

import { staticFile } from "remotion";

export const adsFile = (name: string): string => staticFile(`ads/${name}`);

export const toSrc = (image: string): string =>
  image.startsWith("http://") || image.startsWith("https://")
    ? image
    : adsFile(image);

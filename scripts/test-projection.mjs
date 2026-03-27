import {
  geoMercator,
  geoBounds,
} from "../node_modules/.pnpm/d3-geo@3.1.1/node_modules/d3-geo/src/index.js";
import { readFileSync } from "fs";

const data = JSON.parse(
  readFileSync("./src/components/texasCounties.json", "utf8"),
);

console.log("Features:", data.features.length);

const bounds = geoBounds(data);
console.log("geoBounds (D3):", JSON.stringify(bounds));

const projection = geoMercator().fitExtent(
  [
    [16, 16],
    [944, 564],
  ],
  data,
);
console.log("Scale:", projection.scale());
console.log("Translate:", projection.translate());
console.log("NW corner [-106.65, 36.50]:", projection([-106.65, 36.5]));
console.log("SE corner [-93.52, 25.84]:", projection([-93.52, 25.84]));
console.log("Austin [-97.74, 30.27]:", projection([-97.74, 30.27]));

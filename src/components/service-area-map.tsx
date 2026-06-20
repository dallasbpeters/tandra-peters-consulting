import type { ServiceAreaMapProps } from "../types";
import { MapBox } from "./mapbox";

export const ServiceAreaMap = ({
  eyebrow,
  title,
  description,
  areas = [],
}: ServiceAreaMapProps) => (
  <MapBox
    areas={areas}
    description={description}
    eyebrow={eyebrow}
    title={title}
  />
);

export default ServiceAreaMap;

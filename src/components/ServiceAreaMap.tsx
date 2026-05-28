import { MapBox } from "./Mapbox";
import type { ServiceAreaMapProps } from "../types";

export type { ServiceAreaMapProps };

export const ServiceAreaMap = ({
  eyebrow,
  title,
  description,
  areas = [],
}: ServiceAreaMapProps) => {
  return (
    <MapBox
      eyebrow={eyebrow}
      title={title}
      description={description}
      areas={areas}
    />
  );
};

export default ServiceAreaMap;

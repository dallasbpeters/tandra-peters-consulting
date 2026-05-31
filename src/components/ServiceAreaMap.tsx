import type { ServiceAreaMapProps } from "../types";

import { MapBox } from "./Mapbox";

export type { ServiceAreaMapProps };

export const ServiceAreaMap = ({
  eyebrow,
  title,
  description,
  areas = [],
}: ServiceAreaMapProps) => {
  return <MapBox eyebrow={eyebrow} title={title} description={description} areas={areas} />;
};

export default ServiceAreaMap;

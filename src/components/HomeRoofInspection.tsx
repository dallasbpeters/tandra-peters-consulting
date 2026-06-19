import type { RoofInspectionSectionProps } from "../types";

import { type Chapter, RoofInspection, VIEWS } from "./RoofInspection";
import { hotspotCoordKey } from "./RoofInspection/hotspotCoords";

export interface HomeRoofInspectionProps {
  chapters: Chapter[];
  roofInspection: Partial<RoofInspectionSectionProps>;
}

const HomeRoofInspection = ({
  chapters,
  roofInspection,
}: HomeRoofInspectionProps) => {
  const inspectionTitle = (
    <>
      {roofInspection.titleLine1 ?? "The"}{" "}
      <em>{roofInspection.titleLine2 ?? "Inspection."}</em>
      <br />
      {roofInspection.subtitle ?? "Seven things I check on every roof."}
    </>
  );

  return (
    <RoofInspection chapters={chapters} views={VIEWS}>
      <RoofInspection.Rail
        kicker={roofInspection.kicker}
        lede={roofInspection.lede ?? ""}
        title={inspectionTitle}
      />
      <RoofInspection.Canvas>
        <RoofInspection.Toolbar />
        <RoofInspection.Diagram src="/roof.glb">
          {chapters.map((chapter) => (
            <RoofInspection.Hotspot
              chapter={chapter}
              key={`${chapter.sanityKey ?? chapter.id}-${hotspotCoordKey(chapter.position3d, chapter.normal3d)}`}
            />
          ))}
        </RoofInspection.Diagram>
      </RoofInspection.Canvas>
    </RoofInspection>
  );
};

export default HomeRoofInspection;

import { Img, staticFile } from "remotion";

export interface BadgesConfig {
  gafMasterElite: boolean;
  ikoRoofSelect: boolean;
  rcatMember: boolean;
  rsraCommittee: boolean;
  show: boolean;
  tamkoPro: boolean;
}

type BadgeKey = keyof Omit<BadgesConfig, "show">;

const BADGE_FILES: Record<BadgeKey, string> = {
  gafMasterElite: "GAFMasterEliteResidential.png",
  ikoRoofSelect: "IKORoofSelect.webp",
  rcatMember: "RCATLogo.png",
  rsraCommittee: "RSRAMain.png",
  tamkoPro: "TamkoPrologo.webp",
};

const BADGE_KEYS = Object.keys(BADGE_FILES) as BadgeKey[];

/**
 * Renders a horizontal row of enabled certification badge logos.
 * Each badge sits on a frosted white tile so it's legible on any background.
 */
export function BadgeRow({
  config,
  badgeHeight = 120,
}: {
  config: BadgesConfig;
  badgeHeight?: number;
}) {
  if (!config.show) {
    return null;
  }

  const active = BADGE_KEYS.filter((key) => config[key]);
  if (active.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        alignItems: "center",
      }}
    >
      {active.map((key) => (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={staticFile(`ads/${BADGE_FILES[key]}`)}
            style={{
              height: badgeHeight,
              width: "auto",
              objectFit: "contain",
              display: "block",
              mixBlendMode: "luminosity",
            }}
          />
        </div>
      ))}
    </div>
  );
}

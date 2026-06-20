import type React from "react";

import { layoutClass } from "../styles/layout-classes";
import { theme } from "../theme";
import type { CertificationsProps } from "../types";

const defaultCertifications: CertificationsProps["certifications"] = [
  { image: "/roofing-soloar-alliance.png", name: "Roofing Solar Alliance" },
  { image: "/roof-pro.png", name: "Roof Pro" },
  { image: "/tamko-pro.png", name: "Tamko Pro" },
  { image: "/bbb-logo.webp", name: "Better Business Bureau" },
  { image: "/rcat.webp", name: "RCAT" },
  { image: "/owens-corning.webp", name: "Owens Corning" },
  { image: "/gaf-master-elite.png", name: "GAF Master Elite" },
  { image: "/gaf-commercial.webp", name: "GAF Commercial" },
];

export const Certifications: React.FC<CertificationsProps> = ({
  certifications = defaultCertifications,
}) => {
  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.paper,
    paddingBlock: theme.spacing.lg,
  };

  return (
    <section
      className={`${layoutClass.containerWide} certifications`}
      id="certifications"
      style={sectionStyle}
    >
      <div className="certifications__logos">
        {certifications.map((certification) => (
          <img
            alt={certification.name}
            className="certifications__logo"
            decoding="async"
            height={68}
            key={certification.name}
            loading="lazy"
            src={certification.image}
            width={160}
          />
        ))}
      </div>
    </section>
  );
};

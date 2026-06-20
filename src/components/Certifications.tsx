import type React from "react";

import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";
import type { CertificationsProps } from "../types";

const defaultCertifications: CertificationsProps["certifications"] = [
  { name: "Roofing Solar Alliance", image: "/roofing-soloar-alliance.png" },
  { name: "Roof Pro", image: "/roof-pro.png" },
  { name: "Tamko Pro", image: "/tamko-pro.png" },
  { name: "Better Business Bureau", image: "/bbb-logo.webp" },
  { name: "RCAT", image: "/rcat.webp" },
  { name: "Owens Corning", image: "/owens-corning.webp" },
  { name: "GAF Master Elite", image: "/gaf-master-elite.png" },
  { name: "GAF Commercial", image: "/gaf-commercial.webp" },
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

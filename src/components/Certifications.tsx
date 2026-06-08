import React from "react";

import type { CertificationsProps } from "../types";

import { layoutClass } from "../styles/layoutClasses";
import { theme } from "../theme";

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
      id="certifications"
      className={`${layoutClass.containerWide} certifications`}
      style={sectionStyle}
      aria-labelledby="certifications-heading"
    >
      <div className="certifications__logos">
        {certifications.map((certification) => (
          <img
            key={certification.name}
            className="certifications__logo"
            src={certification.image}
            alt={certification.name}
            width={160}
            height={68}
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
    </section>
  );
};

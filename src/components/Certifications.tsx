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
  title,
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
      aria-label={typeof title === "string" && title.trim() ? undefined : "Certifications"}
      aria-labelledby={
        typeof title === "string" && title.trim() ? "certifications-heading" : undefined
      }
    >
      {typeof title === "string" && title.trim() ? (
        <h2 id="certifications-heading" style={{ margin: 0, marginBottom: theme.spacing.md }}>
          {title}
        </h2>
      ) : null}
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

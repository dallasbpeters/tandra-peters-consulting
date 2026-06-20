import { Hammer, Home, HomeUser } from "iconoir-react";
import { motion } from "motion/react";
import type React from "react";

import { layoutClass } from "../styles/layout-classes";
import { mix, theme } from "../theme";
import type { Stat, StatsProps } from "../types";

const defaultStatItems: Stat[] = [
  { icon: HomeUser, name: "Customers", value: "24,999" },
  { icon: Home, name: "Re-Roofs", value: "18,137" },
  { icon: Hammer, name: "Repairs", value: "6,862" },
];

export const Stats: React.FC<StatsProps> = ({
  title = "Birdcreek Roofing in Austin",
  items = defaultStatItems,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, transition: { duration: 0.6 }, y: 0 },
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.evergladeLight,
    borderBottom: `1px solid ${mix(theme.colors.paperDark, 20)}`,
    color: theme.colors.white,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  };

  const labelStyle: React.CSSProperties = {
    color: theme.colors.white,
    fontFamily: theme.fonts.headline,
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
  };

  const statsTextStyle: React.CSSProperties = {
    fontSize: ".775rem",
    fontWeight: 900,
    letterSpacing: "0.5em",
    textTransform: "uppercase",
  };
  const statsValueStyle: React.CSSProperties = {
    fontSize: "2rem",
    fontWeight: 900,
    textTransform: "uppercase",
  };

  return (
    <section style={sectionStyle}>
      <div className={`${layoutClass.containerWideStatsRow} md-row`}>
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          style={labelStyle}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, x: 0 }}
        >
          {title}
        </motion.span>
        <motion.div
          className="wa-cluster wa-align-items-start wa-gap-2xl"
          initial="hidden"
          style={{ transition: "all 0.5s" }}
          variants={containerVariants}
          viewport={{ once: true }}
          whileInView="visible"
        >
          {items.map((stat, i) => (
            <motion.div
              className="wa-cluster wa-gap-xs"
              key={stat.rowKey ?? `${stat.name}-${stat.value}-${i}`}
              variants={itemVariants}
            >
              <stat.icon color={theme.colors.purple} height={48} width={48} />
              <div className="wa-stack wa-align-items-start">
                <span style={statsValueStyle}>{stat.value}</span>
                <span style={statsTextStyle}>{stat.name}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

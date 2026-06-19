import { HomeUser, Hammer, Home } from "iconoir-react";
import { motion } from "motion/react";
import React from "react";

import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import { Stat, StatsProps } from "../types";

const defaultStatItems: Stat[] = [
  { name: "Customers", value: "24,999", icon: HomeUser },
  { name: "Re-Roofs", value: "18,137", icon: Home },
  { name: "Repairs", value: "6,862", icon: Hammer },
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
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: theme.colors.evergladeLight,
    color: theme.colors.white,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottom: `1px solid ${mix(theme.colors.paperDark, 20)}`,
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headline,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.3em",
    fontSize: "11px",
    color: theme.colors.white,
  };

  const statsTextStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: ".775rem",
    textTransform: "uppercase",
    letterSpacing: "0.5em",
  };
  const statsValueStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: "2rem",
    textTransform: "uppercase",
  };

  return (
    <section style={sectionStyle}>
      <div className={`${layoutClass.containerWideStatsRow} md-row`}>
        <motion.span
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          style={labelStyle}
        >
          {title}
        </motion.span>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="wa-cluster wa-align-items-start wa-gap-2xl"
          style={{ transition: "all 0.5s" }}
        >
          {items.map((stat, i) => (
            <motion.div
              key={stat.rowKey ?? `${stat.name}-${stat.value}-${i}`}
              variants={itemVariants}
              className="wa-cluster wa-gap-xs"
            >
              <stat.icon color={theme.colors.purple} width={48} height={48} />
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

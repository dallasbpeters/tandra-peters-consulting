import type { Metric } from "../../lib/desk-types";

export const MetricCard = ({ metric }: { metric: Metric }) => (
  <article className="desk-metric">
    <strong>{metric.value}</strong>
    <span>{metric.label}</span>
    <p>{metric.note}</p>
  </article>
);

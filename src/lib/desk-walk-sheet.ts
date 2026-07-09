import { escapeCsvField, slugify } from "./desk-format";
import type { CanvassTargetRecord } from "./desk-types";

const buildWalkSheetCsv = (target: CanvassTargetRecord): string => {
  const rows: (number | string)[][] = [
    [
      "neighborhood",
      "county",
      "zip",
      "mail_pieces",
      "older_owner_homes",
      "median_income",
      "median_year_built",
      "median_home_age",
      "walked",
    ],
  ];
  for (const item of target.neighborhoods) {
    rows.push([
      item.neighborhood || item.label,
      item.county,
      item.postalCode,
      item.recommendedMailerCount ?? item.homes,
      item.homes,
      item.medianIncome ?? "",
      item.medianYearBuilt ?? "",
      item.medianHomeAge ?? "",
      "",
    ]);
  }
  return rows
    .map((row) => row.map((field) => escapeCsvField(field)).join(","))
    .join("\n");
};

export const downloadWalkSheet = (target: CanvassTargetRecord): void => {
  const blob = new Blob([buildWalkSheetCsv(target)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.download = `walk-sheet-${slugify(target.name)}.csv`;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

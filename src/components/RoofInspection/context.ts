import { createContext, useContext } from "react";
import type { RoofInspectionContextValue } from "./types";

export const RoofInspectionContext =
  createContext<RoofInspectionContextValue | null>(null);

export const useRoofInspection = (): RoofInspectionContextValue => {
  const ctx = useContext(RoofInspectionContext);
  if (!ctx) {
    throw new Error(
      "useRoofInspection must be used inside a <RoofInspection> root component.",
    );
  }
  return ctx;
};

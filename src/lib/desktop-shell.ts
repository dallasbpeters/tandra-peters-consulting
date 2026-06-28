type WindowWithElectronProcess = Window & {
  process?: {
    versions?: {
      electron?: string;
    };
  };
};

const ELECTRON_USER_AGENT_REGEX = /\bElectron\/\d+/i;

export const isElectronDesktopApp = (): boolean => {
  if (
    typeof navigator !== "undefined" &&
    ELECTRON_USER_AGENT_REGEX.test(navigator.userAgent)
  ) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    (window as WindowWithElectronProcess).process?.versions?.electron
  );
};

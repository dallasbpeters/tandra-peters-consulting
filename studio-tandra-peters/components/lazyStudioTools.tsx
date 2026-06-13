import { lazy, Suspense, type ComponentType } from "react";

const StudioToolFallback = () => (
  <div
    style={{
      alignItems: "center",
      display: "flex",
      justifyContent: "center",
      minHeight: "12rem",
      padding: "2rem",
    }}
  >
    Loading tool…
  </div>
);

const lazyStudioTool = (loader: () => Promise<{ default: ComponentType }>) => {
  const LazyTool = lazy(loader);

  return function LazyStudioTool() {
    return (
      <Suspense fallback={<StudioToolFallback />}>
        <LazyTool />
      </Suspense>
    );
  };
};

export const LazyImageManagerTool = lazyStudioTool(() =>
  import("./SanityImageManagerTool").then((module) => ({
    default: module.SanityImageManagerTool,
  })),
);

export const LazyFalImageStudioTool = lazyStudioTool(() =>
  import("./FalImageStudioTool").then((module) => ({
    default: module.FalImageStudioTool,
  })),
);

export const LazyEmailPreviewTool = lazyStudioTool(() =>
  import("./EmailPreviewTool").then((module) => ({
    default: module.EmailPreviewTool,
  })),
);

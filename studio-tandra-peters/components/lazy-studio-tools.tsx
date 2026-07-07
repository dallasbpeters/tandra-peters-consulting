import type { ComponentType } from "react";
import { lazy, Suspense } from "react";

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

export const LazyImageManagerTool = lazyStudioTool(async () => {
  const module = await import("./SanityImageManagerTool");
  return {
    default: module.SanityImageManagerTool,
  };
});

export const LazyFalImageStudioTool = lazyStudioTool(async () => {
  const module = await import("./fali-image-studio-tool");
  return {
    default: module.FalImageStudioTool,
  };
});

export const LazyEmailPreviewTool = lazyStudioTool(async () => {
  const module = await import("./email-preview-tool");
  return {
    default: module.EmailPreviewTool,
  };
});

export const LazyDeskTool = lazyStudioTool(async () => {
  const module = await import("./desk-tool");
  return {
    default: module.DeskTool,
  };
});

export const LazyRemotionVideoTool = lazyStudioTool(async () => {
  const module = await import("./RemotionVideoTool");
  return {
    default: module.RemotionVideoTool,
  };
});

export const LazyGaDashboardTool = lazyStudioTool(async () => {
  const module = await import("./GaDashboardTool");
  return {
    default: module.GaDashboardTool,
  };
});

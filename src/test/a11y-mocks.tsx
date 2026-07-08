/**
 * Vitest mocks for accessibility tests only.
 * Import this module at the top of `src/a11y/*.test.tsx` before component imports.
 */
import React from "react";
import { vi } from "vitest";

import type { PostDetail } from "../types/article";

export const mockArticlePost: PostDetail = {
  _id: "post-a11y-1",
  body: "A practical walkthrough of ridge, field, flashing, and ventilation checks.",
  category: "inspections",
  excerpt: "What I look for on every residential inspection.",
  publishedAt: "2025-06-01",
  slug: "test-article",
  title: "How to inspect your roof in Texas",
};

// IntersectionObserver that immediately reports visible — Mapbox / deferred sections render in tests.
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this
    );
  }

  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;

if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = class {
    observe() {
      // noop
    }
    unobserve() {
      // noop
    }
    disconnect() {
      // noop
    }
  } as unknown as typeof ResizeObserver;
}

const localStorageStore = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    clear: () => {
      localStorageStore.clear();
    },
    getItem: (key: string) => localStorageStore.get(key) ?? null,
    key: (index: number) => [...localStorageStore.keys()][index] ?? null,
    get length() {
      return localStorageStore.size;
    },
    removeItem: (key: string) => {
      localStorageStore.delete(key);
    },
    setItem: (key: string, value: string) => {
      localStorageStore.set(key, value);
    },
  },
});

if (
  typeof customElements !== "undefined" &&
  !customElements.get("model-viewer")
) {
  class ModelViewerElement extends HTMLElement {
    // noop
  }
  customElements.define("model-viewer", ModelViewerElement);
}

vi.mock("mapbox-gl", () => {
  class MapboxMapMock {
    addControl() {
      return this;
    }
    on(_event: string, _layerOrHandler?: unknown, _handler?: unknown) {
      return this;
    }
    once(event: string, handler?: () => void) {
      if (event === "style.load" && handler) {
        handler();
      }
      return this;
    }
    off() {
      return this;
    }
    remove() {
      // noop
    }
    getCanvas() {
      return document.createElement("canvas");
    }
    getSource() {
      return null;
    }
    getLayer() {
      return;
    }
    getStyle() {
      return { layers: [] };
    }
    addSource() {
      // noop
    }
    addLayer() {
      // noop
    }
    removeLayer() {
      // noop
    }
    setPaintProperty() {
      // noop
    }
    setFilter() {
      // noop
    }
    fitBounds() {
      // noop
    }
    isStyleLoaded() {
      return true;
    }
  }

  return {
    default: {
      AttributionControl: class {
        // noop
      },
      LngLatBounds: class {
        extend() {
          return this;
        }
      },
      Map: MapboxMapMock,
      NavigationControl: class {
        // noop
      },
      Popup: class {
        setLngLat() {
          return this;
        }
        setHTML() {
          return this;
        }
        addTo() {
          // noop
        }
      },
      accessToken: "",
    },
  };
});

vi.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}));

vi.mock("shaders/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shaders/react")>();
  const NullShaderChild = () => null;

  return {
    ...actual,
    ChromaFlow: NullShaderChild,
    Dither: NullShaderChild,
    Halftone: NullShaderChild,
    ImageTexture: NullShaderChild,
    LinearGradient: NullShaderChild,
    MultiPointGradient: NullShaderChild,
    SolidColor: NullShaderChild,
    Swirl: NullShaderChild,
    WaveDistortion: NullShaderChild,
  };
});

vi.mock("@gsap/react", () => ({
  useGSAP: () => {
    // noop
  },
}));

vi.mock("@remotion/player", () => {
  const mockPlayerApi = {
    addEventListener: () => {
      // noop
    },
    getCurrentFrame: () => 0,
    isPlaying: () => false,
    pause: () => {
      // noop
    },
    play: () => {
      // noop
    },
    removeEventListener: () => {
      // noop
    },
    seekTo: () => {
      // noop
    },
  };

  const MockRemotionPlayer = React.forwardRef<typeof mockPlayerApi>(
    (_props, ref) => {
      React.useImperativeHandle(ref, () => mockPlayerApi);
      return (
        <section aria-label="Featured video player">Remotion player</section>
      );
    }
  );
  MockRemotionPlayer.displayName = "MockRemotionPlayer";

  return {
    Player: MockRemotionPlayer,
  };
});

vi.mock("@google/model-viewer", () => ({}));

vi.mock("@awesome.me/webawesome/dist/react/details/index.js", () => ({
  default: ({
    summary,
    children,
    name,
  }: {
    summary?: React.ReactNode;
    children?: React.ReactNode;
    name?: string;
  }) => (
    <details name={name}>
      <summary>{summary}</summary>
      {children}
    </details>
  ),
}));

vi.mock("../hooks/use-sanity-articles-index", () => ({
  useSanityArticlesIndex: () => ({
    error: null,
    loading: false,
    page: null,
    posts: [],
    refetch: async () => {
      // noop
    },
  }),
}));

vi.mock("../hooks/use-sanity-post-by-slug", () => ({
  useSanityPostBySlug: () => ({
    error: null,
    loading: false,
    post: mockArticlePost,
  }),
}));

vi.mock("../context/dashboard-auth-context", () => ({
  useGoogleDashboardAuth: () => ({
    authError: null,
    buttonRef: { current: null },
    clientId: "test-client-id",
    ready: true,
    signOut: () => {
      // noop
    },
    token: "test-token",
    user: { email: "test@example.com", name: "Test User", picture: "" },
  }),
}));

vi.mock("../hooks/use-seo-dashboard", () => ({
  useSeoDashboard: () => ({
    data: null,
    error: null,
    loading: false,
    refresh: async () => {
      // noop
    },
  }),
}));

vi.mock("../hooks/use-sanity-image-assets", () => ({
  useSanityImageAssets: () => ({
    error: null,
    images: [],
    loading: false,
    refresh: () => {
      // noop
    },
  }),
}));

vi.mock("../hooks/use-unsplash-image-search", () => ({
  useUnsplashImageSearch: () => ({
    error: null,
    images: [],
    loading: false,
    refresh: () => {
      // noop
    },
  }),
}));

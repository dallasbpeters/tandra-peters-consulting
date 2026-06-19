/**
 * Vitest mocks for accessibility tests only.
 * Import this module at the top of `src/a11y/*.test.tsx` before component imports.
 */
import React from "react";
import { vi } from "vitest";

import type { PostDetail } from "../types/article";

export const mockArticlePost: PostDetail = {
  _id: "post-a11y-1",
  title: "How to inspect your roof in Texas",
  slug: "test-article",
  publishedAt: "2025-06-01",
  excerpt: "What I look for on every residential inspection.",
  category: "inspections",
  body: "A practical walkthrough of ridge, field, flashing, and ventilation checks.",
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

const localStorageStore = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => localStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStorageStore.set(key, value);
    },
    removeItem: (key: string) => {
      localStorageStore.delete(key);
    },
    clear: () => {
      localStorageStore.clear();
    },
    key: (index: number) => Array.from(localStorageStore.keys())[index] ?? null,
    get length() {
      return localStorageStore.size;
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
      accessToken: "",
      Map: MapboxMapMock,
      NavigationControl: class {
        // noop
      },
      AttributionControl: class {
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
      LngLatBounds: class {
        extend() {
          return this;
        }
      },
    },
  };
});

vi.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}));

vi.mock("shaders/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("shaders/react")>();
  const NullShaderChild = () => null;

  return {
    ...actual,
    MultiPointGradient: NullShaderChild,
    ChromaFlow: NullShaderChild,
    LinearGradient: NullShaderChild,
    WaveDistortion: NullShaderChild,
    Dither: NullShaderChild,
    ImageTexture: NullShaderChild,
    Halftone: NullShaderChild,
    SolidColor: NullShaderChild,
    Swirl: NullShaderChild,
  };
});

vi.mock("@gsap/react", () => ({
  useGSAP: () => undefined,
}));

vi.mock("@remotion/player", () => {
  const mockPlayerApi = {
    getCurrentFrame: () => 0,
    isPlaying: () => false,
    play: () => {
      // noop
    },
    pause: () => {
      // noop
    },
    seekTo: () => {
      // noop
    },
    addEventListener: () => {
      // noop
    },
    removeEventListener: () => {
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

vi.mock("../hooks/useSanityArticlesIndex", () => ({
  useSanityArticlesIndex: () => ({
    page: null,
    posts: [],
    loading: false,
    error: null,
    refetch: async () => {
      // noop
    },
  }),
}));

vi.mock("../hooks/useSanityPostBySlug", () => ({
  useSanityPostBySlug: () => ({
    post: mockArticlePost,
    loading: false,
    error: null,
  }),
}));

vi.mock("../hooks/useGoogleDashboardAuth", () => ({
  useGoogleDashboardAuth: () => ({
    ready: true,
    token: "test-token",
    user: { email: "test@example.com", name: "Test User", picture: "" },
    authError: null,
    clientId: "test-client-id",
    buttonRef: { current: null },
    signOut: () => {
      // noop
    },
  }),
}));

vi.mock("../hooks/useSeoDashboard", () => ({
  useSeoDashboard: () => ({
    data: null,
    loading: false,
    error: null,
    refresh: async () => {
      // noop
    },
  }),
}));

vi.mock("../hooks/useSanityImageAssets", () => ({
  useSanityImageAssets: () => ({
    images: [],
    loading: false,
    error: null,
    refresh: () => {
      // noop
    },
  }),
}));

vi.mock("../hooks/useUnsplashImageSearch", () => ({
  useUnsplashImageSearch: () => ({
    images: [],
    loading: false,
    error: null,
    refresh: () => {
      // noop
    },
  }),
}));

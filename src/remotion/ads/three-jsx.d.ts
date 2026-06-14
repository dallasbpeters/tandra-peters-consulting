/**
 * Makes @react-three/fiber's intrinsic elements (`<group>`, `<mesh>`,
 * `<ambientLight>`, `<primitive>`, …) available as JSX everywhere under the
 * SPA's tsconfig.
 *
 * fiber v9 ships this same augmentation, but it only takes effect when the
 * `react/jsx-runtime` module augmentation is actually loaded — which doesn't
 * happen reliably through a `/// <reference types="@react-three/fiber" />`
 * directive alone (it loads the package's index types, not the runtime module
 * augmentation). Re-declaring it here in a project ambient `.d.ts` guarantees
 * it is always applied for the auto-generated RoofModel.tsx and RoofScene.tsx.
 */
import type { ThreeElements } from "@react-three/fiber";

declare module "react/jsx-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module "react" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends ThreeElements {}
  }
}

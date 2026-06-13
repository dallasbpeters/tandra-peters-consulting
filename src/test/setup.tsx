import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import { setupServer } from "msw/node";
import React from "react";
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";

expect.extend(toHaveNoViolations);

import { handlers } from "./handlers";

// ── Browser API stubs (jsdom doesn't implement these) ─────────────────────────
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// ── MSW server ────────────────────────────────────────────────────────────────
export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── PostHog mock ──────────────────────────────────────────────────────────────
export const mockCapture = vi.fn();
export const mockIdentify = vi.fn();
export const mockCaptureException = vi.fn();

vi.mock("@posthog/react", () => ({
  usePostHog: () => ({
    capture: mockCapture,
    identify: mockIdentify,
    captureException: mockCaptureException,
    getFeatureFlag: () => undefined,
    featureFlags: { hasLoadedFlags: true, getFlags: () => [] },
  }),
  useFeatureFlagVariantKey: () => undefined,
}));

const waFieldId = (label?: string, name?: string, id?: string) =>
  (id as string) ||
  (name as string) ||
  (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "field");

// ── Web component stubs ───────────────────────────────────────────────────────
vi.mock("@awesome.me/webawesome/dist/react/input/index.js", () => ({
  default: ({
    label,
    name,
    value,
    onChange,
    onInput,
    type = "text",
    id,
    children: _children, // slot content – not valid on <input>
    autocomplete: _autocomplete, // web-component attribute, not camelCase
    withLabel: _withLabel, // web-component-only prop
    withClear: _withClear, // web-component-only prop
    maxlength: maxlengthProp, // web-component attribute, not camelCase
    ...rest
  }: Record<string, unknown> & {
    label?: string;
    name?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    id?: string;
    children?: React.ReactNode;
    autocomplete?: string;
    withLabel?: boolean;
    withClear?: boolean;
    maxlength?: number | string;
  }) => {
    const fieldId = waFieldId(label, name, id);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onInput?.(event);
    };

    return (
      <div>
        {label ? <label htmlFor={fieldId}>{label}</label> : null}
        <input
          id={fieldId}
          name={(name as string) ?? fieldId}
          type={type}
          value={(value as string) ?? ""}
          onChange={handleChange}
          maxLength={
            typeof maxlengthProp === "number"
              ? maxlengthProp
              : typeof maxlengthProp === "string"
                ? Number.parseInt(maxlengthProp, 10) || undefined
                : undefined
          }
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      </div>
    );
  },
}));

vi.mock("@awesome.me/webawesome/dist/react/textarea/index.js", () => ({
  default: ({
    label,
    name,
    value,
    onChange,
    onInput,
    id,
    children: _children, // no slot content on <textarea>
    autocomplete: _autocomplete,
    withLabel: _withLabel,
    ...rest
  }: Record<string, unknown> & {
    label?: string;
    name?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onInput?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    id?: string;
    children?: React.ReactNode;
    autocomplete?: string;
    withLabel?: boolean;
  }) => {
    const fieldId = waFieldId(label, name, id);
    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(event);
      onInput?.(event);
    };

    return (
      <div>
        {label ? <label htmlFor={fieldId}>{label}</label> : null}
        <textarea
          id={fieldId}
          name={(name as string) ?? fieldId}
          value={(value as string) ?? ""}
          onChange={handleChange}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      </div>
    );
  },
}));

vi.mock("@awesome.me/webawesome/dist/react/select/index.js", () => ({
  default: ({
    label,
    name,
    value,
    onChange,
    children,
    ...rest
  }: Record<string, unknown> & {
    label?: string;
    name?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children?: React.ReactNode;
  }) => {
    const fieldId = waFieldId(label, name);
    return (
      <div>
        {label ? <label htmlFor={fieldId}>{label}</label> : null}
        <select
          id={fieldId}
          name={(name as string) ?? fieldId}
          value={(value as string) ?? ""}
          onChange={onChange}
          {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {children}
        </select>
      </div>
    );
  },
}));

vi.mock("@awesome.me/webawesome/dist/react/slider/index.js", () => {
  const MockWaSlider = React.forwardRef<
    HTMLInputElement,
    {
      label?: string;
      name?: string;
      value?: number;
      min?: number;
      max?: number;
      step?: number;
      onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    }
  >(({ label, name, value, min, max, step, onChange }, ref) => {
    const fieldId = waFieldId(label, name);
    return (
      <div>
        {label ? <label htmlFor={fieldId}>{label}</label> : null}
        <input
          ref={ref}
          id={fieldId}
          name={(name as string) ?? fieldId}
          type="range"
          value={value ?? min ?? 0}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
        />
      </div>
    );
  });
  MockWaSlider.displayName = "MockWaSlider";

  return { default: MockWaSlider };
});

vi.mock("@awesome.me/webawesome/dist/react/number-input/index.js", () => {
  const MockWaNumberInput = React.forwardRef<
    HTMLInputElement,
    {
      label?: string;
      name?: string;
      value?: string;
      min?: number;
      max?: number;
      step?: number;
      onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    }
  >(({ label, name, value, min, max, step, onChange }, ref) => {
    const fieldId = waFieldId(label, name);
    return (
      <div>
        {label ? <label htmlFor={fieldId}>{label}</label> : null}
        <input
          ref={ref}
          id={fieldId}
          name={(name as string) ?? fieldId}
          type="number"
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
        />
      </div>
    );
  });
  MockWaNumberInput.displayName = "MockWaNumberInput";

  return { default: MockWaNumberInput };
});

vi.mock("@awesome.me/webawesome/dist/react/switch/index.js", () => ({
  default: ({
    label,
    name,
    checked,
    onChange,
    children,
  }: {
    label?: string;
    name?: string;
    checked?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    children?: React.ReactNode;
  }) => {
    const childLabel = typeof children === "string" ? children : undefined;
    const textLabel = label ?? childLabel;
    const fieldId = waFieldId(textLabel, name);
    return (
      <div>
        {textLabel ? <label htmlFor={fieldId}>{children ?? textLabel}</label> : null}
        <input
          id={fieldId}
          name={(name as string) ?? fieldId}
          type="checkbox"
          role="switch"
          checked={Boolean(checked)}
          onChange={onChange}
          aria-label={textLabel}
        />
      </div>
    );
  },
}));

vi.mock("@awesome.me/webawesome/dist/react/color-picker/index.js", () => ({
  default: ({
    label,
    name,
    value,
    onChange,
  }: {
    label?: string;
    name?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => {
    const fieldId = waFieldId(label, name);
    return (
      <div>
        {label ? <label htmlFor={fieldId}>{label}</label> : null}
        <input
          id={fieldId}
          name={(name as string) ?? fieldId}
          type="color"
          value={value ?? "#000000"}
          onChange={onChange}
        />
      </div>
    );
  },
}));

vi.mock("@awesome.me/webawesome/dist/react/option/index.js", () => ({
  default: ({ value, children }: { value?: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

// Mapbox Address Autofill mounts a custom element that crashes jsdom on unmount;
// render its children (the native address input) directly in tests.
vi.mock("@mapbox/search-js-react", () => ({
  AddressAutofill: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

vi.mock("../components/TransitionLink", () => ({
  TransitionLink: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("../components/GoogleAuthGate", () => ({
  GoogleAuthGate: ({ children }: { children?: React.ReactNode }) => children ?? null,
  GoogleAuthGateProvider: ({ children }: { children?: React.ReactNode }) => children,
  GoogleAuthFooterTrigger: () => null,
}));

vi.mock("@awesome.me/webawesome/dist/styles/themes/default.css", () => ({}));

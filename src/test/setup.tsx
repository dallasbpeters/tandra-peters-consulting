import "@testing-library/jest-dom";
import React from "react";
import { setupServer } from "msw/node";
import { handlers } from "./handlers";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

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
  }),
}));

// ── Web component stubs ───────────────────────────────────────────────────────
vi.mock("@awesome.me/webawesome/dist/react/input/index.js", () => ({
  default: ({
    label,
    name,
    value,
    onChange,
    type = "text",
    id: _id,
    children: _children, // slot content – not valid on <input>
    autocomplete: _autocomplete, // web-component attribute, not camelCase
    withLabel: _withLabel, // web-component-only prop
    ...rest
  }: Record<string, unknown> & {
    label?: string;
    name?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    id?: string;
    children?: React.ReactNode;
    autocomplete?: string;
    withLabel?: boolean;
  }) => (
    <div>
      {label && <label htmlFor={name as string}>{label as string}</label>}
      <input
        id={name as string}
        name={name as string}
        type={type}
        value={(value as string) ?? ""}
        onChange={onChange}
        {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    </div>
  ),
}));

vi.mock("@awesome.me/webawesome/dist/react/textarea/index.js", () => ({
  default: ({
    label,
    name,
    value,
    onChange,
    id: _id,
    children: _children, // no slot content on <textarea>
    autocomplete: _autocomplete,
    withLabel: _withLabel,
    ...rest
  }: Record<string, unknown> & {
    label?: string;
    name?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    id?: string;
    children?: React.ReactNode;
    autocomplete?: string;
    withLabel?: boolean;
  }) => (
    <div>
      {label && <label htmlFor={name as string}>{label as string}</label>}
      <textarea
        id={name as string}
        name={name as string}
        value={(value as string) ?? ""}
        onChange={onChange}
        {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    </div>
  ),
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
  }) => (
    <div>
      {label && <label htmlFor={name as string}>{label as string}</label>}
      <select
        id={name as string}
        name={name as string}
        value={(value as string) ?? ""}
        onChange={onChange}
        {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {children}
      </select>
    </div>
  ),
}));

vi.mock("@awesome.me/webawesome/dist/react/option/index.js", () => ({
  default: ({
    value,
    children,
  }: {
    value?: string;
    children?: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

vi.mock("../components/TransitionLink", () => ({
  TransitionLink: ({
    children,
    to,
  }: {
    children: React.ReactNode;
    to: string;
  }) => <a href={to}>{children}</a>,
}));

vi.mock("@awesome.me/webawesome/dist/styles/webawesome.css", () => ({}));

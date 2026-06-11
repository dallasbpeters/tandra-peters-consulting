import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeEach } from "vitest";

import { server } from "../test/setup";
import { mockCapture, mockIdentify, mockCaptureException } from "../test/setup";
import { Contact } from "./Contact";
import { CONTACT_API_PATH } from "./Contact";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fillRequiredFields = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: { message?: string } = {},
) => {
  await user.type(screen.getByRole("textbox", { name: /full name/i }), "Jane Doe");
  await user.type(screen.getByRole("textbox", { name: /email address/i }), "jane@example.com");
  await user.type(
    screen.getByRole("textbox", { name: /your message/i }),
    overrides.message ?? "Hello, I need a roof inspection.",
  );
  // Check the consent checkbox
  await user.click(screen.getByRole("checkbox"));
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("Contact form", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockCapture.mockClear();
    mockIdentify.mockClear();
    mockCaptureException.mockClear();
  });

  // ── render ──────────────────────────────────────────────────────────────────

  it("renders the form with required fields", () => {
    render(<Contact />);

    expect(screen.getByRole("textbox", { name: /full name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /your message/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  // ── happy path ──────────────────────────────────────────────────────────────

  it("submits successfully and shows success state", async () => {
    render(<Contact />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      // FIX 1: match the actual success message text
      expect(screen.getByText(/message was sent/i)).toBeInTheDocument();
    });

    // PostHog tracking
    expect(mockIdentify).toHaveBeenCalledWith(
      "jane@example.com",
      expect.objectContaining({ email: "jane@example.com", name: "Jane Doe" }),
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "contact_form_submitted",
      expect.objectContaining({ has_message: true }),
    );
  });

  it("replaces the form with a confirmation after a successful submission", async () => {
    render(<Contact />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/message was sent/i);
    });

    // The form is swapped out for the confirmation, so no fields remain.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send message/i })).not.toBeInTheDocument();
  });

  // ── validation ──────────────────────────────────────────────────────────────

  it("shows error when consent is not checked", async () => {
    render(<Contact />);

    // Fill everything except consent
    await user.type(screen.getByRole("textbox", { name: /full name/i }), "Jane Doe");
    await user.type(screen.getByRole("textbox", { name: /email address/i }), "jane@example.com");
    await user.type(screen.getByRole("textbox", { name: /your message/i }), "Hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/please confirm you agree to be contacted/i)).toBeInTheDocument();
    });

    // No network request should have been made
    expect(mockCapture).not.toHaveBeenCalledWith("contact_form_submitted", expect.anything());
  });

  it("does not submit while already sending", async () => {
    let resolveRequest: (value: Response) => void;
    const pendingRequest = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(http.post(CONTACT_API_PATH, () => pendingRequest as Promise<Response>));

    render(<Contact />);
    await fillRequiredFields(user);

    const submitBtn = screen.getByRole("button", { name: /send message/i });
    await user.click(submitBtn);

    // Button should be disabled while sending
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Clicking again should be a no-op
    await user.click(submitBtn);
    expect(mockCapture).not.toHaveBeenCalledWith("contact_form_submitted", expect.anything());

    // Clean up
    resolveRequest!(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });

  // ── honeypot ────────────────────────────────────────────────────────────────

  it("honeypot field is hidden from users", () => {
    render(<Contact />);

    // The honeypot input has tabIndex=-1 and aria-hidden
    const honeypotInput = document.querySelector('input[name="_hp"]') as HTMLInputElement | null;

    expect(honeypotInput).toBeInTheDocument();
    expect(honeypotInput).toHaveAttribute("tabindex", "-1");
    expect(honeypotInput).toHaveAttribute("aria-hidden");
  });

  it("still submits the honeypot value in the request body", async () => {
    let capturedBody: Record<string, unknown> | null = null;

    server.use(
      http.post(CONTACT_API_PATH, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true });
      }),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      // FIX 1: match the actual success message text
      expect(screen.getByText(/message was sent/i)).toBeInTheDocument();
    });

    expect(capturedBody).toHaveProperty("_hp", "");
  });

  // ── API error responses ─────────────────────────────────────────────────────

  it("shows generic error message on generic 500 with JSON error body", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () =>
        HttpResponse.json({ ok: false, error: "Something failed on the server" }, { status: 500 }),
      ),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/something failed on the server/i)).toBeInTheDocument();
    });

    expect(mockCapture).toHaveBeenCalledWith(
      "contact_form_error",
      expect.objectContaining({ status: 500 }),
    );
  });

  it("shows 404 error message when endpoint is not found", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () => HttpResponse.json({ ok: false }, { status: 404 })),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/endpoint was not found/i)).toBeInTheDocument();
    });
  });

  it("shows 403 CORS/origin error message", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () => HttpResponse.json({ ok: false }, { status: 403 })),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/not allowed to submit/i)).toBeInTheDocument();
    });
  });

  it("shows 503 missing ATTIO_API_TOKEN error message", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () => HttpResponse.json({ ok: false }, { status: 503 })),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/missing attio_api_token/i)).toBeInTheDocument();
    });
  });

  it("shows 502 CRM error message", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () => HttpResponse.json({ ok: false }, { status: 502 })),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/crm error/i)).toBeInTheDocument();
    });
  });

  it("shows unexpected-response error when response is 200 ok but data.ok is false", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () => HttpResponse.json({ ok: false }, { status: 200 })),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/unexpected response/i)).toBeInTheDocument();
    });
  });

  it("shows non-JSON HTML response error", async () => {
    // FIX 3: use status 500 so the 404-specific branch doesn't fire first
    server.use(
      http.post(
        CONTACT_API_PATH,
        () =>
          new HttpResponse("<html>Not Found</html>", {
            status: 500,
            headers: { "Content-Type": "text/html" },
          }),
      ),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/server returned an error instead of json/i)).toBeInTheDocument();
    });
  });

  it("shows Vercel FUNCTION_INVOCATION_FAILED error", async () => {
    server.use(
      http.post(
        CONTACT_API_PATH,
        () =>
          new HttpResponse("<html>500</html>", {
            status: 500,
            headers: {
              "Content-Type": "text/html",
              "x-vercel-error": "FUNCTION_INVOCATION_FAILED",
            },
          }),
      ),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/server failed to run on vercel/i)).toBeInTheDocument();
    });
  });

  it("shows server HTML error for non-FUNCTION_INVOCATION_FAILED Vercel error", async () => {
    server.use(
      http.post(
        CONTACT_API_PATH,
        () =>
          new HttpResponse("<html>Error</html>", {
            status: 500,
            headers: {
              "Content-Type": "text/html",
              "x-vercel-error": "FUNCTION_INVOCATION_TIMEOUT",
            },
          }),
      ),
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/server returned an error instead of json/i)).toBeInTheDocument();
    });
  });

  // ── network error ───────────────────────────────────────────────────────────

  it("shows network error message when fetch throws", async () => {
    // FIX 2: use HttpResponse.error() — throwing inside a handler corrupts MSW
    server.use(http.post(CONTACT_API_PATH, () => HttpResponse.error()));

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/network or cors error/i)).toBeInTheDocument();
    });

    expect(mockCaptureException).toHaveBeenCalled();
  });

  // ── request body ────────────────────────────────────────────────────────────

  it("sends the correct request body on submit", async () => {
    let capturedBody: Record<string, unknown> | null = null;

    server.use(
      http.post(CONTACT_API_PATH, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true });
      }),
    );

    render(<Contact />);

    await user.type(screen.getByRole("textbox", { name: /full name/i }), "Jane Doe");
    await user.type(screen.getByRole("textbox", { name: /email address/i }), "jane@example.com");
    await user.type(screen.getByRole("textbox", { name: /your message/i }), "Need a quote please.");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      // FIX 1: match the actual success message text
      expect(screen.getByText(/message was sent/i)).toBeInTheDocument();
    });

    expect(capturedBody).toMatchObject({
      fullName: "Jane Doe",
      email: "jane@example.com",
      message: "Need a quote please.",
      consentToContact: true,
      _hp: "",
    });
  });
});

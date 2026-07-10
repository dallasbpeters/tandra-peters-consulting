import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import {
  mockCapture,
  mockCaptureException,
  mockIdentify,
  server,
} from "../test/setup";
import { CONTACT_API_PATH, Contact } from "./contact";

// ─── module-level regex constants ────────────────────────────────────────────

const FULL_NAME_LABEL = /full name/iu;
const EMAIL_ADDRESS_LABEL = /email address/iu;
const YOUR_MESSAGE_LABEL = /your message/iu;
const PROPERTY_ADDRESS_LABEL = /property address/iu;
const SEND_MESSAGE_BUTTON = /send message/iu;
const MESSAGE_WAS_SENT = /message was sent/iu;
const CONSENT_ERROR = /please confirm you agree to be contacted/iu;
const SOMETHING_FAILED_ON_SERVER = /something failed on the server/iu;
const ENDPOINT_NOT_FOUND = /endpoint was not found/iu;
const NOT_ALLOWED_TO_SUBMIT = /not allowed to submit/iu;
const EMAIL_DELIVERY_NOT_CONFIGURED = /email delivery isn't configured/iu;
const COULD_NOT_SEND_MESSAGE = /could not send your message/iu;
const UNEXPECTED_RESPONSE = /unexpected response/iu;
const SERVER_RETURNED_HTML_ERROR = /server returned an error instead of json/iu;
const SERVER_FAILED_ON_VERCEL = /server failed to run on vercel/iu;
const NETWORK_OR_CORS_ERROR = /network or cors error/iu;

// ─── helpers ─────────────────────────────────────────────────────────────────

const fillRequiredFields = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: { message?: string } = {}
) => {
  await user.type(
    screen.getByRole("textbox", { name: FULL_NAME_LABEL }),
    "Jane Doe"
  );
  await user.type(
    screen.getByRole("textbox", { name: EMAIL_ADDRESS_LABEL }),
    "jane@example.com"
  );
  await user.type(
    screen.getByRole("textbox", { name: YOUR_MESSAGE_LABEL }),
    overrides.message ?? "Hello, I need a roof inspection."
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

    expect(
      screen.getByRole("textbox", { name: FULL_NAME_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: EMAIL_ADDRESS_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: YOUR_MESSAGE_LABEL })
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: SEND_MESSAGE_BUTTON })
    ).toBeInTheDocument();
  });

  // ── happy path ──────────────────────────────────────────────────────────────

  it("submits successfully and shows success state", async () => {
    render(<Contact />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      // FIX 1: match the actual success message text
      expect(screen.getByText(MESSAGE_WAS_SENT)).toBeInTheDocument();
    });

    // PostHog tracking
    expect(mockIdentify).toHaveBeenCalledWith(
      "jane@example.com",
      expect.objectContaining({ email: "jane@example.com", name: "Jane Doe" })
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "contact_form_submitted",
      expect.objectContaining({ has_message: true })
    );
  });

  it("replaces the form with a confirmation after a successful submission", async () => {
    render(<Contact />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(MESSAGE_WAS_SENT);
    });

    // The form is swapped out for the confirmation, so no fields remain.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: SEND_MESSAGE_BUTTON })
    ).not.toBeInTheDocument();
  });

  // ── validation ──────────────────────────────────────────────────────────────

  it("shows error when consent is not checked", async () => {
    render(<Contact />);

    // Fill everything except consent
    await user.type(
      screen.getByRole("textbox", { name: FULL_NAME_LABEL }),
      "Jane Doe"
    );
    await user.type(
      screen.getByRole("textbox", { name: EMAIL_ADDRESS_LABEL }),
      "jane@example.com"
    );
    await user.type(
      screen.getByRole("textbox", { name: YOUR_MESSAGE_LABEL }),
      "Hello"
    );
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(CONSENT_ERROR)).toBeInTheDocument();
    });

    // No network request should have been made
    expect(mockCapture).not.toHaveBeenCalledWith(
      "contact_form_submitted",
      expect.anything()
    );
  });

  it("does not submit while already sending", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    const pendingRequest = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.post(CONTACT_API_PATH, () => pendingRequest as Promise<Response>)
    );

    render(<Contact />);
    await fillRequiredFields(user);

    const submitBtn = screen.getByRole("button", { name: SEND_MESSAGE_BUTTON });
    await user.click(submitBtn);

    // Button should be disabled while sending
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Clicking again should be a no-op
    await user.click(submitBtn);
    expect(mockCapture).not.toHaveBeenCalledWith(
      "contact_form_submitted",
      expect.anything()
    );

    // Clean up
    resolveRequest?.(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
  });

  // ── honeypot ────────────────────────────────────────────────────────────────

  it("honeypot field is hidden from users", () => {
    render(<Contact />);

    // The honeypot input has tabIndex=-1 and aria-hidden
    const honeypotInput = document.querySelector(
      'input[name="_hp"]'
    ) as HTMLInputElement | null;

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
      })
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      // FIX 1: match the actual success message text
      expect(screen.getByText(MESSAGE_WAS_SENT)).toBeInTheDocument();
    });

    expect(capturedBody).toHaveProperty("_hp", "");
  });

  // ── API error responses ─────────────────────────────────────────────────────

  it("shows generic error message on generic 500 with JSON error body", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () =>
        HttpResponse.json(
          { error: "Something failed on the server", ok: false },
          { status: 500 }
        )
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(SOMETHING_FAILED_ON_SERVER)).toBeInTheDocument();
    });

    expect(mockCapture).toHaveBeenCalledWith(
      "contact_form_error",
      expect.objectContaining({ status: 500 })
    );
  });

  it("shows 404 error message when endpoint is not found", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () =>
        HttpResponse.json({ ok: false }, { status: 404 })
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(ENDPOINT_NOT_FOUND)).toBeInTheDocument();
    });
  });

  it("shows 403 CORS/origin error message", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () =>
        HttpResponse.json({ ok: false }, { status: 403 })
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(NOT_ALLOWED_TO_SUBMIT)).toBeInTheDocument();
    });
  });

  it("shows 503 email-not-configured error message", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () =>
        HttpResponse.json({ ok: false }, { status: 503 })
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(
        screen.getByText(EMAIL_DELIVERY_NOT_CONFIGURED)
      ).toBeInTheDocument();
    });
  });

  it("shows 502 send-failure error message", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () =>
        HttpResponse.json({ ok: false }, { status: 502 })
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(COULD_NOT_SEND_MESSAGE)).toBeInTheDocument();
    });
  });

  it("shows unexpected-response error when response is 200 ok but data.ok is false", async () => {
    server.use(
      http.post(CONTACT_API_PATH, () =>
        HttpResponse.json({ ok: false }, { status: 200 })
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(UNEXPECTED_RESPONSE)).toBeInTheDocument();
    });
  });

  it("shows non-JSON HTML response error", async () => {
    // FIX 3: use status 500 so the 404-specific branch doesn't fire first
    server.use(
      http.post(
        CONTACT_API_PATH,
        () =>
          new HttpResponse("<html>Not Found</html>", {
            headers: { "Content-Type": "text/html" },
            status: 500,
          })
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(SERVER_RETURNED_HTML_ERROR)).toBeInTheDocument();
    });
  });

  it("shows Vercel FUNCTION_INVOCATION_FAILED error", async () => {
    server.use(
      http.post(
        CONTACT_API_PATH,
        () =>
          new HttpResponse("<html>500</html>", {
            headers: {
              "Content-Type": "text/html",
              "x-vercel-error": "FUNCTION_INVOCATION_FAILED",
            },
            status: 500,
          })
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(SERVER_FAILED_ON_VERCEL)).toBeInTheDocument();
    });
  });

  it("shows server HTML error for non-FUNCTION_INVOCATION_FAILED Vercel error", async () => {
    server.use(
      http.post(
        CONTACT_API_PATH,
        () =>
          new HttpResponse("<html>Error</html>", {
            headers: {
              "Content-Type": "text/html",
              "x-vercel-error": "FUNCTION_INVOCATION_TIMEOUT",
            },
            status: 500,
          })
      )
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(SERVER_RETURNED_HTML_ERROR)).toBeInTheDocument();
    });
  });

  // ── network error ───────────────────────────────────────────────────────────

  it("shows network error message when fetch throws", async () => {
    // FIX 2: use HttpResponse.error() — throwing inside a handler corrupts MSW
    server.use(http.post(CONTACT_API_PATH, () => HttpResponse.error()));

    render(<Contact />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(NETWORK_OR_CORS_ERROR)).toBeInTheDocument();
    });

    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  // ── request body ────────────────────────────────────────────────────────────

  it("sends the correct request body on submit", async () => {
    let capturedBody: Record<string, unknown> | null = null;

    server.use(
      http.post(CONTACT_API_PATH, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true });
      })
    );

    render(<Contact />);

    await user.type(
      screen.getByRole("textbox", { name: FULL_NAME_LABEL }),
      "Jane Doe"
    );
    await user.type(
      screen.getByRole("textbox", { name: EMAIL_ADDRESS_LABEL }),
      "jane@example.com"
    );
    await user.type(
      screen.getByRole("textbox", { name: YOUR_MESSAGE_LABEL }),
      "Need a quote please."
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      // FIX 1: match the actual success message text
      expect(screen.getByText(MESSAGE_WAS_SENT)).toBeInTheDocument();
    });

    expect(capturedBody).toMatchObject({
      _hp: "",
      consentToContact: true,
      email: "jane@example.com",
      fullName: "Jane Doe",
      message: "Need a quote please.",
    });
  });

  it("includes the optional property address in the request body", async () => {
    let capturedBody: Record<string, unknown> | null = null;

    server.use(
      http.post(CONTACT_API_PATH, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true });
      })
    );

    render(<Contact />);
    await fillRequiredFields(user);
    await user.type(
      screen.getByRole("textbox", { name: PROPERTY_ADDRESS_LABEL }),
      "123 Cedar Ridge Dr, Round Rock, TX"
    );
    await user.click(screen.getByRole("button", { name: SEND_MESSAGE_BUTTON }));

    await waitFor(() => {
      expect(screen.getByText(MESSAGE_WAS_SENT)).toBeInTheDocument();
    });

    expect(capturedBody).toMatchObject({
      propertyAddress: "123 Cedar Ridge Dr, Round Rock, TX",
    });
  });
});

import { AddressAutofill } from "@mapbox/search-js-react";
import { usePostHog } from "@posthog/react";
import { CheckCircle, Home, Send, WarningTriangle } from "iconoir-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { SitePageChrome } from "../components/site-page-chrome";
import { TransitionLink } from "../components/transition-link";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { layoutClass } from "../styles/layout-classes";

import "../styles/roof-check.css";

interface RoofCheckForm {
  address: string;
  area: string;
  company: string;
  concern: string;
  contactMethod: string;
  fullName: string;
  roofAge: string;
  timing: string;
}

type SubmitStatus = "idle" | "sending" | "success" | "error";

const timingOptions = [
  "This week",
  "This month",
  "Before selling or buying",
  "Not urgent",
] as const;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

const initialForm = (area: string): RoofCheckForm => ({
  address: "",
  area,
  company: "",
  concern: "",
  contactMethod: "",
  fullName: "",
  roofAge: "",
  timing: "This week",
});

const titleCase = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const areaFromSlug = (slug: string | undefined): string =>
  slug ? titleCase(slug) : "Central Texas";

const parseRoofCheckResponse = async (
  response: Response
): Promise<{ error?: string; ok?: boolean }> => {
  try {
    return (await response.json()) as { error?: string; ok?: boolean };
  } catch {
    return {};
  }
};

const getAutofillAddress = (res: unknown): string => {
  const result = res as {
    features?: {
      properties?: { full_address?: string; place_name?: string };
    }[];
  } | null;
  const props = result?.features?.[0]?.properties;
  return props?.full_address ?? props?.place_name ?? "";
};

const ProofList = () => (
  <ul className="roof-check-proof">
    <li>Leaks, stains, soft spots, or missing shingles</li>
    <li>Older roofs before selling, buying, or renewing insurance</li>
    <li>Repair-or-replace questions before spending money</li>
    <li>Photos you want a roofing person to look at first</li>
  </ul>
);

export const RoofCheckPage = () => {
  const { areaSlug } = useParams();
  const [searchParams] = useSearchParams();
  const areaLabel = useMemo(() => areaFromSlug(areaSlug), [areaSlug]);
  const campaign = searchParams.get("campaign")?.trim() ?? "";
  const [form, setForm] = useState<RoofCheckForm>(() => initialForm(areaLabel));
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const posthog = usePostHog();

  usePageMetadata({
    description:
      "Send Tandra a quick roof note and get a clear next step before you spend money or call insurance.",
    title: `Roof check in ${areaLabel} | Tandra Peters`,
  });

  const updateField = (field: keyof RoofCheckForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") {
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/roof-check", {
        body: JSON.stringify({ ...form, campaign }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await parseRoofCheckResponse(response);

      if (!(response.ok && body.ok)) {
        setStatus("error");
        setErrorMessage(
          body.error ?? "I could not save this roof note. Please try again."
        );
        return;
      }

      posthog?.capture("roof_check_submitted", {
        area: form.area,
        campaign: campaign || "direct",
        timing: form.timing,
      });
      setStatus("success");
      setForm(initialForm(areaLabel));
    } catch {
      setStatus("error");
      setErrorMessage("I could not save this roof note. Please try again.");
    }
  };

  const isSending = status === "sending";

  return (
    <SitePageChrome>
      <div className={`${layoutClass.containerFull} roof-check`}>
        <section className="roof-check-hero">
          <div>
            <span className="roof-check-eyebrow">
              <Home aria-hidden height={18} width={18} />
              Free roof check
            </span>
            <h1>Tell me what is going on with your roof.</h1>
            <p>
              I'll help you understand whether it looks like a repair, an
              inspection, something to watch, or a bigger conversation before
              you spend money or call insurance.
            </p>
          </div>
          <ProofList />
        </section>

        <section className="roof-check-layout">
          <form className="roof-check-form" onSubmit={handleSubmit}>
            <div className="roof-check-form__heading">
              <span>Quick note</span>
              <h2>Send the roof concern</h2>
            </div>

            <label>
              <span>Name</span>
              <input
                autoComplete="name"
                disabled={isSending}
                onChange={(event) =>
                  updateField("fullName", event.currentTarget.value)
                }
                required
                type="text"
                value={form.fullName}
              />
            </label>

            <label>
              <span>Phone or email</span>
              <input
                autoComplete="email"
                disabled={isSending}
                onChange={(event) =>
                  updateField("contactMethod", event.currentTarget.value)
                }
                placeholder="Whatever is easiest for me to use"
                required
                type="text"
                value={form.contactMethod}
              />
            </label>

            <label>
              <span>Neighborhood / city</span>
              <input
                autoComplete="address-level2"
                disabled={isSending}
                onChange={(event) =>
                  updateField("area", event.currentTarget.value)
                }
                required
                type="text"
                value={form.area}
              />
            </label>

            <label htmlFor="roof-check-address">
              <span>Street address</span>
              {MAPBOX_TOKEN ? (
                <AddressAutofill
                  accessToken={MAPBOX_TOKEN}
                  onRetrieve={(result) => {
                    const address = getAutofillAddress(result);
                    if (address) {
                      updateField("address", address);
                    }
                  }}
                  options={{ country: "US", language: "en" }}
                >
                  <input
                    autoComplete="street-address"
                    disabled={isSending}
                    id="roof-check-address"
                    onChange={(event) =>
                      updateField("address", event.currentTarget.value)
                    }
                    placeholder="123 Main St, Georgetown, TX"
                    required
                    type="text"
                    value={form.address}
                  />
                </AddressAutofill>
              ) : (
                <input
                  autoComplete="street-address"
                  disabled={isSending}
                  id="roof-check-address"
                  onChange={(event) =>
                    updateField("address", event.currentTarget.value)
                  }
                  placeholder="123 Main St, Georgetown, TX"
                  required
                  type="text"
                  value={form.address}
                />
              )}
            </label>

            <label>
              <span>Roof age</span>
              <input
                disabled={isSending}
                onChange={(event) =>
                  updateField("roofAge", event.currentTarget.value)
                }
                placeholder="Not sure is fine"
                type="text"
                value={form.roofAge}
              />
            </label>

            <label>
              <span>Timing</span>
              <select
                disabled={isSending}
                onChange={(event) =>
                  updateField("timing", event.currentTarget.value)
                }
                value={form.timing}
              >
                {timingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="roof-check-form__wide">
              <span>What are you seeing?</span>
              <textarea
                disabled={isSending}
                onChange={(event) =>
                  updateField("concern", event.currentTarget.value)
                }
                placeholder="Stain on ceiling, missing shingles, selling soon, older roof, repair quote I want checked..."
                required
                rows={5}
                value={form.concern}
              />
            </label>

            <label className="roof-check-honeypot">
              <span>Company</span>
              <input
                autoComplete="off"
                onChange={(event) =>
                  updateField("company", event.currentTarget.value)
                }
                tabIndex={-1}
                type="text"
                value={form.company}
              />
            </label>

            {status === "success" ? (
              <p className="roof-check-message roof-check-message--success">
                <CheckCircle aria-hidden height={18} width={18} />
                Got it. I'll use this to follow up with a clear next step.
              </p>
            ) : null}

            {status === "error" ? (
              <p className="roof-check-message roof-check-message--error">
                <WarningTriangle aria-hidden height={18} width={18} />
                {errorMessage}
              </p>
            ) : null}

            <button disabled={isSending} type="submit">
              <Send aria-hidden height={18} width={18} />
              {isSending ? "Sending..." : "Send roof note"}
            </button>
          </form>

          <aside className="roof-check-next">
            <h2>What happens next</h2>
            <ol>
              <li>I read the note and look for the practical next step.</li>
              <li>
                I ask for photos if that helps avoid a wasted appointment.
              </li>
              <li>
                If it needs eyes on it, we talk through an inspection window.
              </li>
            </ol>
            <TransitionLink to="/estimate">
              Want a rough cost range?
            </TransitionLink>
          </aside>
        </section>
      </div>
    </SitePageChrome>
  );
};

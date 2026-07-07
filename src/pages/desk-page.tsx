import { usePostHog } from "@posthog/react";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Community,
  Desk,
  Home,
  Mail,
  MediaImage,
  StatsUpSquare,
  VideoCamera,
  WarningTriangle,
} from "iconoir-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SitePageChrome } from "../components/site-page-chrome";
import { TransitionLink } from "../components/transition-link";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { layoutClass } from "../styles/layout-classes";

import "../styles/desk.css";

type Tone = "critical" | "warm" | "good" | "neutral";

interface Metric {
  label: string;
  note: string;
  value: string;
}

interface HotArea {
  area: string;
  audience: string;
  cue: string;
  firstMove: string;
  priority: string;
  signal: string;
  tone: Tone;
}

interface ActionItem {
  channel: string;
  due: string;
  href: string;
  label: string;
  outcome: string;
  owner: string;
  tone: Tone;
}

interface Channel {
  cost: string;
  firstUse: string;
  fit: string;
  name: string;
  risk: string;
  source: string;
}

interface CampaignAsset {
  action: string;
  href: string;
  label: string;
  status: string;
}

interface SelectOption {
  label: string;
  value: string;
}

interface LeadFormState {
  area: string;
  contactMethod: string;
  contactName: string;
  need: string;
  nextStep: string;
  notes: string;
  source: string;
}

interface DeskLeadRecord {
  area: string;
  capturedAt: string;
  contactMethod: string;
  contactName: string;
  id: string;
  need: string;
  nextStep: string;
  source: string;
  status: string;
}

interface DeskCaptureResponse {
  error?: string;
  lead?: DeskLeadRecord;
  leads?: DeskLeadRecord[];
  ok: boolean;
}

interface CaptureMessage {
  text: string;
  tone: "error" | "neutral" | "success";
}

interface LeadFollowUp {
  callOpener: string;
  messageDraft: string;
  nextAction: string;
  postAngle: string;
}

const sourceOptions: readonly SelectOption[] = [
  { label: "Neighbor referral", value: "neighbor-referral" },
  { label: "Postcard", value: "postcard" },
  { label: "Neighborhood post", value: "neighborhood-post" },
  { label: "Google post", value: "google-post" },
  { label: "Partner referral", value: "partner" },
  { label: "Roof-check page", value: "roof-check-page" },
  { label: "Website estimate", value: "website-estimate" },
  { label: "Other", value: "other" },
] as const;

const nextStepOptions: readonly SelectOption[] = [
  { label: "Call today", value: "call-today" },
  { label: "Send checklist", value: "send-checklist" },
  { label: "Book inspection", value: "book-inspection" },
  { label: "Ask for photos", value: "ask-for-photos" },
  { label: "No action yet", value: "no-action-yet" },
] as const;

const WHITESPACE_RE = /\s+/u;

const initialLeadForm: LeadFormState = {
  area: "",
  contactMethod: "",
  contactName: "",
  need: "",
  nextStep: "call-today",
  notes: "",
  source: "neighbor-referral",
};

const leadDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

const metrics: readonly Metric[] = [
  {
    label: "Current lead base",
    note: "Assume zero until a real opt-in arrives.",
    value: "0",
  },
  {
    label: "First useful target",
    note: "Email captures from one focused roof-check page.",
    value: "25",
  },
  {
    label: "Starter postcard test",
    note: "One focused neighborhood before spending more.",
    value: "1.5k",
  },
  {
    label: "Daily actions",
    note: "Concrete outreach tasks the desk should create.",
    value: "6",
  },
] as const;

const hotAreas: readonly HotArea[] = [
  {
    area: "Georgetown / Round Rock",
    audience: "Owner-occupied neighborhoods with older roof likelihood",
    cue: "Roof age, growth, and recurring hail/wind exposure make this the best first test market.",
    firstMove: "Roof-check landing page + postcard + Nextdoor post.",
    priority: "Start here",
    signal: "Roof age + weather exposure",
    tone: "critical",
  },
  {
    area: "Temple / Belton / Killeen",
    audience:
      "Affordable single-family neighborhoods with repair-or-replace questions",
    cue: "Lower CPC pressure than Austin and enough roof age to justify education-first outreach.",
    firstMove:
      "Partner email to agents and inspectors + Facebook neighborhood post.",
    priority: "Second wave",
    signal: "Roof age + partner channel",
    tone: "warm",
  },
  {
    area: "Waco / McLennan",
    audience:
      "Homeowners and property managers who need a trusted local roof read",
    cue: "Good fit for trust-building content before pushing a paid mail drop.",
    firstMove: "Google Business Profile post + short inspection video ad.",
    priority: "Content warmup",
    signal: "Trust-building market",
    tone: "neutral",
  },
] as const;

const actionItems: readonly ActionItem[] = [
  {
    channel: "Landing page",
    due: "Today",
    href: "/roof-check/georgetown",
    label: "Use /roof-check/georgetown for capture",
    outcome: "Live homeowner capture page for proactive campaigns",
    owner: "Dallas",
    tone: "critical",
  },
  {
    channel: "Direct mail",
    due: "Today",
    href: "/ads",
    label: "Build the first postcard creative",
    outcome: "1 mailing area, verify postage before send",
    owner: "Dallas",
    tone: "warm",
  },
  {
    channel: "Neighborhood social",
    due: "Today",
    href: "/marketing",
    label: "Create Nextdoor/Facebook post set",
    outcome: "Post without needing a cold email list",
    owner: "Tandra",
    tone: "good",
  },
  {
    channel: "Video",
    due: "Tomorrow",
    href: "/advertising",
    label: "Render 15-second roof-check ad",
    outcome: "Use on Facebook, Reels, and Google posts",
    owner: "Dallas",
    tone: "neutral",
  },
  {
    channel: "Partner email",
    due: "Tomorrow",
    href: "/emails",
    label: "Send 20 personal partner intros",
    outcome: "Realtors, inspectors, agents, property managers",
    owner: "Tandra",
    tone: "warm",
  },
  {
    channel: "Lead capture",
    due: "This week",
    href: "/estimate",
    label: "Connect roof-check CTA to the Desk capture flow",
    outcome: "First follow-up list from proactive traffic",
    owner: "Dallas",
    tone: "good",
  },
] as const;

const channels: readonly Channel[] = [
  {
    cost: "Free area data, paid postage",
    firstUse:
      "Pick 1-3 Georgetown mailing areas and send a scan-link postcard.",
    fit: "Best proactive homeowner reach without buying bad email lists.",
    name: "Neighborhood postcards",
    risk: "Low",
    source: "USPS mailing areas",
  },
  {
    cost: "Free / manual",
    firstUse:
      "Post short repair-vs-replace and inspection checklists around common homeowner triggers.",
    fit: "Neighborhood trust, roof-age questions, and timely weather follow-up.",
    name: "Nextdoor + Facebook",
    risk: "Low",
    source: "Community feeds",
  },
  {
    cost: "Free / manual",
    firstUse: "Send short personal notes to realtors, inspectors, and agents.",
    fit: "B2B relationships that can refer homeowners before they search.",
    name: "Partner email",
    risk: "Medium",
    source: "Public business contacts",
  },
  {
    cost: "Free",
    firstUse: "Publish the same roof-check angle as a Google profile update.",
    fit: "Local visibility and fresh proof that Tandra is actively helping homeowners.",
    name: "Google profile",
    risk: "Low",
    source: "Owned profile",
  },
  {
    cost: "Free public data",
    firstUse: "Use county records only to choose neighborhoods first.",
    fit: "Target neighborhoods by property age and owner/address patterns.",
    name: "County property records",
    risk: "Medium",
    source: "Property records",
  },
  {
    cost: "Free",
    firstUse:
      "Track hail/wind by county and generate daily priority-area cards.",
    fit: "One trigger for timing routes and choosing the message angle.",
    name: "Weather signals",
    risk: "Low",
    source: "NOAA / NWS",
  },
] as const;

const campaignAssets: readonly CampaignAsset[] = [
  {
    action: "Use live page",
    href: "/roof-check/georgetown",
    label: "Roof-check landing page",
    status: "Live",
  },
  {
    action: "Design",
    href: "/ads",
    label: "Postcard / door hanger",
    status: "Needed",
  },
  {
    action: "Write",
    href: "/marketing",
    label: "Nextdoor + Facebook post pair",
    status: "Needed",
  },
  {
    action: "Render",
    href: "/advertising",
    label: "15-second roof inspection video",
    status: "Ready to build",
  },
  {
    action: "Compose",
    href: "/emails",
    label: "Partner intro email",
    status: "Needed",
  },
] as const;

const toneClass = (tone: Tone) => `desk-pill desk-pill--${tone}`;

const labelFor = (
  value: string,
  options: readonly SelectOption[],
  fallback: string
): string =>
  options.find((option) => option.value === value)?.label ?? fallback;

const firstName = (value: string): string =>
  value.trim().split(WHITESPACE_RE)[0] ?? value;

const truncateSentence = (value: string, maxLength: number): string => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trim()}...`;
};

const formatLeadDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }
  return leadDateFormatter.format(date);
};

const parseDeskCaptureResponse = async (
  response: Response
): Promise<DeskCaptureResponse> => {
  try {
    return (await response.json()) as DeskCaptureResponse;
  } catch {
    return {
      error: response.ok
        ? undefined
        : "Desk capture returned an empty response.",
      ok: response.ok,
    };
  }
};

const nextActionFor = (lead: DeskLeadRecord): string => {
  switch (lead.nextStep) {
    case "send-checklist": {
      return "Send the roof-check checklist, then ask for exterior photos and any ceiling-stain photos.";
    }
    case "book-inspection": {
      return "Offer two inspection windows and ask who should be there for the roof walk.";
    }
    case "ask-for-photos": {
      return "Ask for roof, attic, ceiling, and damage photos before recommending an inspection.";
    }
    case "no-action-yet": {
      return "Hold this as a warm record, then follow up when the neighborhood campaign goes out.";
    }
    default: {
      return "Call today, confirm the concern, and offer a clear next step without pushing a claim.";
    }
  }
};

const buildLeadFollowUp = (lead: DeskLeadRecord): LeadFollowUp => {
  const name = firstName(lead.contactName);
  const need = truncateSentence(lead.need, 140);

  return {
    callOpener: `Hi ${name}, this is Tandra with Birdcreek Roofing. I saw the note about ${need}. I'm calling to help you get a plain read on whether this needs a repair, an inspection, or just watching for now.`,
    messageDraft: `Hi ${name}, this is Tandra with Birdcreek Roofing. I can help you get a clear read on the roof around ${lead.area}. If you can send a few photos and the main concern, I'll tell you what I'd check first and whether it is worth scheduling an inspection.`,
    nextAction: nextActionFor(lead),
    postAngle: `For homeowners around ${lead.area}: if your roof is older, recently repaired, or you are seeing stains, missing shingles, or soft spots, I can help you understand what is urgent and what can wait before you call insurance or sign anything.`,
  };
};

const MetricCard = ({ metric }: { metric: Metric }) => (
  <article className="desk-metric">
    <strong>{metric.value}</strong>
    <span>{metric.label}</span>
    <p>{metric.note}</p>
  </article>
);

const HotAreaCard = ({ area }: { area: HotArea }) => (
  <article className="desk-hot-area">
    <div className="desk-hot-area__header">
      <span className={toneClass(area.tone)}>{area.priority}</span>
      <strong>{area.area}</strong>
    </div>
    <dl className="desk-facts">
      <div>
        <dt>Signal</dt>
        <dd>{area.signal}</dd>
      </div>
      <div>
        <dt>Audience</dt>
        <dd>{area.audience}</dd>
      </div>
      <div>
        <dt>Why now</dt>
        <dd>{area.cue}</dd>
      </div>
    </dl>
    <div className="desk-hot-area__move">
      <CheckCircle aria-hidden height={18} width={18} />
      <span>{area.firstMove}</span>
    </div>
  </article>
);

const ActionRow = ({ item }: { item: ActionItem }) => (
  <li className="desk-action">
    <div>
      <span className={toneClass(item.tone)}>{item.due}</span>
      <h3>{item.label}</h3>
      <p>{item.outcome}</p>
    </div>
    <div className="desk-action__meta">
      <span>{item.channel}</span>
      <span>{item.owner}</span>
      <TransitionLink className="desk-link-button" to={item.href}>
        Open
        <ArrowRight aria-hidden height={16} width={16} />
      </TransitionLink>
    </div>
  </li>
);

const ChannelCard = ({ channel }: { channel: Channel }) => (
  <article className="desk-channel">
    <div className="desk-channel__topline">
      <span>{channel.source}</span>
      <span>{channel.risk} risk</span>
    </div>
    <h3>{channel.name}</h3>
    <p>{channel.fit}</p>
    <dl>
      <div>
        <dt>Cost</dt>
        <dd>{channel.cost}</dd>
      </div>
      <div>
        <dt>First use</dt>
        <dd>{channel.firstUse}</dd>
      </div>
    </dl>
  </article>
);

const CampaignAssetRow = ({ asset }: { asset: CampaignAsset }) => (
  <li className="desk-asset">
    <div>
      <strong>{asset.label}</strong>
      <span>{asset.status}</span>
    </div>
    <TransitionLink className="desk-text-link" to={asset.href}>
      {asset.action}
    </TransitionLink>
  </li>
);

const RecentLeadList = ({
  isLoading,
  leads,
}: {
  isLoading: boolean;
  leads: readonly DeskLeadRecord[];
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
    } catch {
      setCopiedId(null);
    }
  };

  if (isLoading) {
    return <p className="desk-empty">Loading captured follow-ups...</p>;
  }

  if (leads.length === 0) {
    return (
      <p className="desk-empty">
        No captured follow-ups yet. Add the first one as soon as a name,
        address, or referral comes in.
      </p>
    );
  }

  return (
    <ul className="desk-lead-list">
      {leads.map((lead) => {
        const followUp = buildLeadFollowUp(lead);

        return (
          <li className="desk-lead" key={lead.id}>
            <div>
              <strong>{lead.contactName}</strong>
              <span>{lead.area}</span>
            </div>
            <p>{lead.need}</p>
            <dl>
              <div>
                <dt>Source</dt>
                <dd>{labelFor(lead.source, sourceOptions, lead.source)}</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>
                  {labelFor(lead.nextStep, nextStepOptions, lead.nextStep)}
                </dd>
              </div>
              <div>
                <dt>Captured</dt>
                <dd>{formatLeadDate(lead.capturedAt)}</dd>
              </div>
            </dl>
            <div className="desk-lead-call-sheet">
              <strong>Next action</strong>
              <p>{followUp.nextAction}</p>
              <div className="desk-lead-copy-grid">
                <button
                  onClick={async () => {
                    await copyText(`${lead.id}:call`, followUp.callOpener);
                  }}
                  type="button"
                >
                  {copiedId === `${lead.id}:call`
                    ? "Copied"
                    : "Copy call opener"}
                </button>
                <button
                  onClick={async () => {
                    await copyText(`${lead.id}:message`, followUp.messageDraft);
                  }}
                  type="button"
                >
                  {copiedId === `${lead.id}:message`
                    ? "Copied"
                    : "Copy text/email"}
                </button>
                <button
                  onClick={async () => {
                    await copyText(`${lead.id}:post`, followUp.postAngle);
                  }}
                  type="button"
                >
                  {copiedId === `${lead.id}:post`
                    ? "Copied"
                    : "Copy post angle"}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const DeskCapturePanel = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => {
  const [form, setForm] = useState<LeadFormState>(initialLeadForm);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [leads, setLeads] = useState<DeskLeadRecord[]>([]);
  const [message, setMessage] = useState<CaptureMessage | null>(null);

  const authHeader = useMemo(() => {
    if (!auth.token) {
      return null;
    }
    return { Authorization: `Bearer ${auth.token}` };
  }, [auth.token]);

  const updateField = useCallback(
    (field: keyof LeadFormState, value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const loadLeads = useCallback(async () => {
    if (!authHeader) {
      setLeads([]);
      return;
    }

    setIsLoadingLeads(true);
    try {
      const response = await fetch("/api/desk-capture", {
        headers: authHeader,
      });
      const body = await parseDeskCaptureResponse(response);
      if (response.ok && body.ok && body.leads) {
        setLeads(body.leads);
        return;
      }
      setMessage({
        text: body.error ?? "Could not load captured follow-ups.",
        tone: "error",
      });
    } catch {
      setMessage({
        text: "Could not load captured follow-ups.",
        tone: "error",
      });
    } finally {
      setIsLoadingLeads(false);
    }
  }, [authHeader]);

  useEffect(() => {
    const run = async () => {
      await loadLeads();
    };
    run();
  }, [loadLeads]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authHeader) {
      setMessage({
        text: "Sign in before saving follow-ups.",
        tone: "error",
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/desk-capture", {
        body: JSON.stringify(form),
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = await parseDeskCaptureResponse(response);
      if (!(response.ok && body.ok && body.lead)) {
        setMessage({
          text: body.error ?? "Could not save this follow-up.",
          tone: "error",
        });
        return;
      }

      const savedLead = body.lead;
      setLeads((current) => [
        savedLead,
        ...current.filter((lead) => lead.id !== savedLead.id),
      ]);
      setForm(initialLeadForm);
      setMessage({
        text: "Captured. It is now in Desk leads.",
        tone: "success",
      });
    } catch {
      setMessage({
        text: "Could not save this follow-up.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formDisabled = isSaving || !authHeader;

  return (
    <section className="desk-section desk-capture" id="capture">
      <div className="desk-section__heading">
        <Mail aria-hidden height={22} width={22} />
        <div>
          <span>Capture</span>
          <h2>Add a follow-up now</h2>
        </div>
      </div>

      <div className="desk-capture__layout">
        <form className="desk-capture-form" onSubmit={handleSubmit}>
          <label>
            <span>Name or address</span>
            <input
              autoComplete="name"
              disabled={formDisabled}
              onChange={(event) =>
                updateField("contactName", event.currentTarget.value)
              }
              placeholder="Maria R. / 118 Oak Bend"
              required
              type="text"
              value={form.contactName}
            />
          </label>

          <label>
            <span>Phone or email</span>
            <input
              autoComplete="email"
              disabled={formDisabled}
              onChange={(event) =>
                updateField("contactMethod", event.currentTarget.value)
              }
              placeholder="512-555-0198 or name@email.com"
              required
              type="text"
              value={form.contactMethod}
            />
          </label>

          <label>
            <span>Neighborhood / city</span>
            <input
              autoComplete="address-level2"
              disabled={formDisabled}
              onChange={(event) =>
                updateField("area", event.currentTarget.value)
              }
              placeholder="Georgetown, Serenada, Round Rock..."
              required
              type="text"
              value={form.area}
            />
          </label>

          <label>
            <span>Where it came from</span>
            <select
              disabled={formDisabled}
              onChange={(event) =>
                updateField("source", event.currentTarget.value)
              }
              value={form.source}
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="desk-capture-form__wide">
            <span>What needs follow-up</span>
            <textarea
              disabled={formDisabled}
              onChange={(event) =>
                updateField("need", event.currentTarget.value)
              }
              placeholder="Roof is 14 years old, wants an inspection before listing..."
              required
              rows={4}
              value={form.need}
            />
          </label>

          <label>
            <span>Next step</span>
            <select
              disabled={formDisabled}
              onChange={(event) =>
                updateField("nextStep", event.currentTarget.value)
              }
              value={form.nextStep}
            >
              {nextStepOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="desk-capture-form__wide">
            <span>Notes</span>
            <textarea
              disabled={formDisabled}
              onChange={(event) =>
                updateField("notes", event.currentTarget.value)
              }
              placeholder="Who mentioned them, timing, photos needed, best time to call..."
              rows={3}
              value={form.notes}
            />
          </label>

          {message ? (
            <p
              className={`desk-capture-message desk-capture-message--${message.tone}`}
            >
              {message.text}
            </p>
          ) : null}

          <button
            className="desk-primary-link"
            disabled={formDisabled}
            type="submit"
          >
            <CheckCircle aria-hidden height={18} width={18} />
            {isSaving ? "Saving..." : "Capture follow-up"}
          </button>
        </form>

        <aside className="desk-capture-recent">
          <div>
            <span className="desk-pill desk-pill--good">Recent</span>
            <h3>Captured follow-ups</h3>
          </div>
          <RecentLeadList isLoading={isLoadingLeads} leads={leads} />
        </aside>
      </div>
    </section>
  );
};

const AuthPanel = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
  <section className="desk-auth">
    <WarningTriangle aria-hidden height={22} width={22} />
    <div>
      <h1>Sign in to Desk</h1>
      <p>Private acquisition planning for Tandra's outreach work.</p>
      {auth.clientId ? <div ref={auth.buttonRef} /> : null}
      {auth.clientId ? null : (
        <p>
          Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable dashboard sign-in.
        </p>
      )}
      {auth.authError ? <p>{auth.authError}</p> : null}
    </div>
  </section>
);

const DeskDashboard = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
  <div className={layoutClass.containerFull}>
    <div className="desk">
      <header className="desk-hero">
        <div>
          <span className="desk-eyebrow">
            <Desk aria-hidden height={18} width={18} />
            Desk
          </span>
          <h1>Proactive demand before the first form fill.</h1>
          <p>
            Build daily outreach from roof-age signals, neighborhood targeting,
            partner relationships, weather moments, and opt-in capture instead
            of waiting for leads that do not exist yet.
          </p>
        </div>
        <nav aria-label="Desk shortcuts" className="desk-hero__actions">
          <a className="desk-primary-link" href="#capture">
            <CheckCircle aria-hidden height={18} width={18} />
            Capture follow-up
          </a>
          <TransitionLink
            className="desk-primary-link"
            to="/roof-check/georgetown"
          >
            <Home aria-hidden height={18} width={18} />
            Open roof-check page
          </TransitionLink>
          <TransitionLink className="desk-primary-link" to="/ads">
            <MediaImage aria-hidden height={18} width={18} />
            Build creative
          </TransitionLink>
          <TransitionLink className="desk-secondary-link" to="/emails">
            <Mail aria-hidden height={18} width={18} />
            Compose outreach
          </TransitionLink>
        </nav>
      </header>

      <section aria-label="Desk metrics" className="desk-metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <DeskCapturePanel auth={auth} />

      <section className="desk-grid desk-grid--wide-left">
        <div className="desk-section">
          <div className="desk-section__heading">
            <StatsUpSquare aria-hidden height={22} width={22} />
            <div>
              <span>Priority areas</span>
              <h2>Where to push first</h2>
            </div>
          </div>
          <div className="desk-hot-list">
            {hotAreas.map((area) => (
              <HotAreaCard area={area} key={area.area} />
            ))}
          </div>
        </div>

        <aside className="desk-section desk-section--tight">
          <div className="desk-section__heading">
            <StatsUpSquare aria-hidden height={22} width={22} />
            <div>
              <span>Capture model</span>
              <h2>The first loop</h2>
            </div>
          </div>
          <ol className="desk-loop">
            <li>
              Roof age, local activity, partner, or weather signal creates a
              priority-area card.
            </li>
            <li>
              Postcards, neighborhood posts, Google updates, and partners send
              people to one page.
            </li>
            <li>
              The page or Desk captures the name, contact method, neighborhood,
              issue, and next step.
            </li>
            <li>
              Personal follow-up and useful email turn captured names into
              inspection calls.
            </li>
          </ol>
        </aside>
      </section>

      <section className="desk-grid desk-grid--wide-right">
        <div className="desk-section">
          <div className="desk-section__heading">
            <Calendar aria-hidden height={22} width={22} />
            <div>
              <span>Action queue</span>
              <h2>Today's work</h2>
            </div>
          </div>
          <ul className="desk-actions">
            {actionItems.map((item) => (
              <ActionRow item={item} key={item.label} />
            ))}
          </ul>
        </div>

        <aside className="desk-campaign">
          <span className="desk-pill desk-pill--critical">First campaign</span>
          <h2>Georgetown roof-check pack</h2>
          <p>
            One market, one message, one scan link. This is the first campaign
            to prove the desk can create traffic before a lead list exists.
          </p>
          <ul>
            {campaignAssets.map((asset) => (
              <CampaignAssetRow asset={asset} key={asset.label} />
            ))}
          </ul>
        </aside>
      </section>

      <section className="desk-section">
        <div className="desk-section__heading">
          <Community aria-hidden height={22} width={22} />
          <div>
            <span>Cheap/free sources</span>
            <h2>Acquisition channels to wire in</h2>
          </div>
        </div>
        <div className="desk-channel-grid">
          {channels.map((channel) => (
            <ChannelCard channel={channel} key={channel.name} />
          ))}
        </div>
      </section>

      <section className="desk-next">
        <div>
          <CheckCircle aria-hidden height={24} width={24} />
          <h2>Next build step</h2>
          <p>
            Replace seed cards with stored campaign documents: signal, area,
            audience, channel, asset links, spend, scan URL, captured
            follow-ups, and booked calls.
          </p>
        </div>
        <TransitionLink className="desk-primary-link" to="/marketing">
          <VideoCamera aria-hidden height={18} width={18} />
          Draft the first campaign
        </TransitionLink>
      </section>
    </div>
  </div>
);

export const DeskPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();

  usePageMetadata({
    description:
      "Internal Desk dashboard for proactive roofing outreach, campaign planning, and lead capture targets.",
    robots: "noindex, nofollow",
    title: "Desk | Tandra Peters",
  });

  useEffect(() => {
    posthog?.capture("desk_viewed");
  }, [posthog]);

  return (
    <SitePageChrome>
      {auth.clientId && !auth.token ? (
        <div className={layoutClass.containerWide}>
          <AuthPanel auth={auth} />
        </div>
      ) : (
        <DeskDashboard auth={auth} />
      )}
    </SitePageChrome>
  );
};

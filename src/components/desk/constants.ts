import type {
  ActionItem,
  CampaignAsset,
  CanvassStatus,
  DeskBoardStatusValue,
  Metric,
} from "../../lib/desk-types";

export const canvassStatusLabels: Record<CanvassStatus, string> = {
  done: "Done",
  planned: "Planned",
  walking: "Walking",
};

export const canvassStatusOrder: readonly CanvassStatus[] = [
  "planned",
  "walking",
  "done",
];

export const metrics: readonly Metric[] = [
  {
    label: "Current lead base",
    note: "Assume zero until a real opt-in arrives.",
    value: "0",
  },
  {
    label: "First useful target",
    note: "Email captures from one focused estimate page.",
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

export const actionItems: readonly ActionItem[] = [
  {
    channel: "Landing page",
    due: "Today",
    href: "/estimate",
    label: "Use /estimate for homeowner capture",
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
    label: "Render 15-second estimate ad",
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
    label: "Connect estimate CTA to the Desk capture flow",
    outcome: "First follow-up list from proactive traffic",
    owner: "Dallas",
    tone: "good",
  },
] as const;

export const campaignAssets: readonly CampaignAsset[] = [
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

export const toneClass = (tone: import("../../lib/desk-types").Tone) =>
  `desk-pill desk-pill--${tone}`;

export const assetSeedKey = (label: string): string => `asset:${label}`;

export const SEED_ACTION_KEYS = new Set(actionItems.map((item) => item.label));

export const SEED_ASSET_KEYS = new Set(
  campaignAssets.map((asset) => assetSeedKey(asset.label))
);

export const CONTENT_STATUS_ORDER: readonly DeskBoardStatusValue[] = [
  "idea",
  "scheduled",
  "published",
];

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  published: "Published",
  scheduled: "Scheduled",
};

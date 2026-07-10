export type FieldType =
  | "text"
  | "textarea"
  | "boolean"
  | "select"
  | "number"
  | "color";

export interface EditorField {
  key: string;
  label: string;
  options?: string[];
  placeholder?: string;
  type: FieldType;
}

export interface EditorSection {
  fields: EditorField[];
  key: string;
  label: string;
}

type EditorSchema = EditorSection[];

const IMAGE_OPTIONS = [
  "photo-0.png",
  "photo-1.png",
  "photo-2.png",
  "photo-3.png",
  "photo-8.png",
  "photo-9.png",
  "photo-10.jpg",
  "photo-11.png",
  "photo-12.jpg",
  "photo-13.jpeg",
  "photo-14.jpg",
  "photo-15.jpg",
  "photo-16.jpg",
  "photo-17.jpeg",
  "photo-21.jpeg",
  "photo-20.jpeg",
  "photo-19.jpeg",
  "photo-18.jpeg",
];

const badgeFields: EditorField[] = [
  { key: "badges.show", label: "Show badges", type: "boolean" },
  { key: "badges.gafMasterElite", label: "GAF Master Elite", type: "boolean" },
  { key: "badges.ikoRoofSelect", label: "IKO Roof Select", type: "boolean" },
  { key: "badges.rcatMember", label: "RCAT Member", type: "boolean" },
  { key: "badges.rsraCommittee", label: "RSRA Committee", type: "boolean" },
  { key: "badges.tamkoPro", label: "Tamko Pro", type: "boolean" },
];

const profilePhotoFields: EditorField[] = [
  {
    key: "intro.showProfilePhoto",
    label: "Show profile photo",
    type: "boolean",
  },
  { key: "intro.profilePhoto.src", label: "Photo URL", type: "textarea" },
];

const helpingSceneFields = (index: number, label: string): EditorSection => ({
  fields: [
    { key: `scenes.${index}.headline`, label: "Headline", type: "text" },
    { key: `scenes.${index}.body`, label: "Body", type: "textarea" },
    { key: `scenes.${index}.showPill`, label: "Show pill", type: "boolean" },
    { key: `scenes.${index}.pill`, label: "Pill text", type: "text" },
    {
      key: `scenes.${index}.image`,
      label: "Background image",
      options: IMAGE_OPTIONS,
      type: "select",
    },
  ],
  key: `scene${index}`,
  label,
});

const helpingOpeningFields: EditorSection = {
  fields: [
    { key: "scenes.0.line1", label: "Line 1", type: "text" },
    { key: "scenes.0.line2", label: "Line 2", type: "text" },
    { key: "scenes.0.line3", label: "Line 3", type: "text" },
    { key: "scenes.0.style", label: "Light leak style", type: "number" },
    { key: "scenes.0.hueshift", label: "Hue shift", type: "number" },
    { key: "scenes.0.shiftDuration", label: "Shift duration", type: "number" },
  ],
  key: "opening",
  label: "Opening scene",
};

const helpingCtaFields: EditorSection = {
  fields: [
    { key: "scenes.5.setup", label: "Setup", type: "text" },
    { key: "scenes.5.punch", label: "Punch", type: "textarea" },
    { key: "scenes.5.action", label: "Action", type: "text" },
    { key: "scenes.5.badge", label: "Badge", type: "text" },
    { key: "scenes.5.byline", label: "Byline", type: "text" },
    { key: "scenes.5.badges.show", label: "Show badges", type: "boolean" },
    {
      key: "scenes.5.badges.gafMasterElite",
      label: "GAF Master Elite",
      type: "boolean",
    },
    {
      key: "scenes.5.badges.ikoRoofSelect",
      label: "IKO Roof Select",
      type: "boolean",
    },
    {
      key: "scenes.5.badges.rcatMember",
      label: "RCAT Member",
      type: "boolean",
    },
    {
      key: "scenes.5.badges.rsraCommittee",
      label: "RSRA Committee",
      type: "boolean",
    },
    { key: "scenes.5.badges.tamkoPro", label: "Tamko Pro", type: "boolean" },
  ],
  key: "cta",
  label: "CTA scene",
};

const helpingLogoFields: EditorSection = {
  fields: [{ key: "scenes.6.text", label: "Logo text", type: "text" }],
  key: "logo",
  label: "Logo scene",
};

export const SCHEMAS: Record<string, EditorSchema> = {
  "whiteboard-explainer": [
    {
      fields: [
        { key: "accentColor", label: "Accent color", type: "color" },
        {
          key: "backgroundColor",
          label: "Background color",
          type: "color",
        },
        { key: "inkColor", label: "Ink color", type: "color" },
        { key: "showHand", label: "Show hand/marker cursor", type: "boolean" },
        {
          key: "handVideoSrc",
          label: "Hand video URL (VP9+alpha WebM, black bg removed)",
          type: "text",
        },
        {
          key: "handSrc",
          label: "Hand PNG URL (marker-tip-facing-left, transparent bg)",
          type: "text",
        },
        {
          key: "handTipXRatio",
          label: "Marker tip X position in image (0–1, default 0.14)",
          type: "number",
        },
        {
          key: "handTipYRatio",
          label: "Marker tip Y position in image (0–1, default 0.78)",
          type: "number",
        },
        {
          key: "voiceId",
          label: "ElevenLabs voice ID (Tandra's cloned voice)",
          placeholder: "leave blank to use ELEVENLABS_TANDRA_VOICE_ID env var",
          type: "text",
        },
      ],
      key: "style",
      label: "Style & Voice",
    },
    {
      fields: [
        { key: "scenes.0.type", label: "Scene 1 type", type: "text" },
        {
          key: "scenes.0.headline",
          label: "Scene 1 headline",
          type: "textarea",
        },
        { key: "scenes.0.eyebrow", label: "Scene 1 eyebrow", type: "text" },
        { key: "scenes.0.subtitle", label: "Scene 1 subtitle", type: "text" },
        {
          key: "scenes.0.narration.script",
          label: "Narration script",
          type: "textarea",
        },
        {
          key: "scenes.0.narration.audioUrl",
          label: "Audio URL (generated)",
          type: "textarea",
        },
        {
          key: "scenes.0.illustrationUrl",
          label: "Illustration URL (FAL AI)",
          type: "textarea",
        },
        {
          key: "scenes.0.drawing.prompt",
          label: "Drawing prompt (describe what to draw)",
          type: "text",
        },
        {
          key: "scenes.0.drawing.paths",
          label: "Drawing paths (JSON array — auto-filled by Generate)",
          type: "textarea",
        },
      ],
      key: "scene0",
      label: "Scene 1 — Title",
    },
    {
      fields: [
        { key: "scenes.1.heading", label: "Heading", type: "text" },
        { key: "scenes.1.bullets.0", label: "Bullet 1", type: "text" },
        { key: "scenes.1.bullets.1", label: "Bullet 2", type: "text" },
        { key: "scenes.1.bullets.2", label: "Bullet 3", type: "text" },
        {
          key: "scenes.1.useCheckboxes",
          label: "Use checkboxes",
          type: "boolean",
        },
        {
          key: "scenes.1.narration.script",
          label: "Narration script",
          type: "textarea",
        },
        {
          key: "scenes.1.narration.audioUrl",
          label: "Audio URL (generated)",
          type: "textarea",
        },
        {
          key: "scenes.1.illustrationUrl",
          label: "Illustration URL (FAL AI)",
          type: "textarea",
        },
        {
          key: "scenes.1.drawing.prompt",
          label: "Drawing prompt (describe what to draw)",
          type: "text",
        },
        {
          key: "scenes.1.drawing.paths",
          label: "Drawing paths (JSON array — auto-filled by Generate)",
          type: "textarea",
        },
      ],
      key: "scene1",
      label: "Scene 2 — Bullets",
    },
    {
      fields: [
        {
          key: "scenes.2.label",
          label: "Label (e.g. 'Did You Know?')",
          type: "text",
        },
        { key: "scenes.2.stat", label: "Big stat / number", type: "text" },
        { key: "scenes.2.body", label: "Body text", type: "textarea" },
        { key: "scenes.2.emphasis", label: "Emphasis line", type: "text" },
        {
          key: "scenes.2.narration.script",
          label: "Narration script",
          type: "textarea",
        },
        {
          key: "scenes.2.narration.audioUrl",
          label: "Audio URL (generated)",
          type: "textarea",
        },
        {
          key: "scenes.2.illustrationUrl",
          label: "Illustration URL (FAL AI)",
          type: "textarea",
        },
        {
          key: "scenes.2.drawing.prompt",
          label: "Drawing prompt (describe what to draw)",
          type: "text",
        },
        {
          key: "scenes.2.drawing.paths",
          label: "Drawing paths (JSON array — auto-filled by Generate)",
          type: "textarea",
        },
      ],
      key: "scene2",
      label: "Scene 3 — Callout",
    },
    {
      fields: [
        { key: "scenes.3.heading", label: "Heading", type: "text" },
        { key: "scenes.3.steps.0.label", label: "Step 1 label", type: "text" },
        {
          key: "scenes.3.steps.0.detail",
          label: "Step 1 detail",
          type: "text",
        },
        { key: "scenes.3.steps.1.label", label: "Step 2 label", type: "text" },
        {
          key: "scenes.3.steps.1.detail",
          label: "Step 2 detail",
          type: "text",
        },
        { key: "scenes.3.steps.2.label", label: "Step 3 label", type: "text" },
        {
          key: "scenes.3.steps.2.detail",
          label: "Step 3 detail",
          type: "text",
        },
        {
          key: "scenes.3.narration.script",
          label: "Narration script",
          type: "textarea",
        },
        {
          key: "scenes.3.narration.audioUrl",
          label: "Audio URL (generated)",
          type: "textarea",
        },
        {
          key: "scenes.3.illustrationUrl",
          label: "Illustration URL (FAL AI)",
          type: "textarea",
        },
        {
          key: "scenes.3.drawing.prompt",
          label: "Drawing prompt (describe what to draw)",
          type: "text",
        },
        {
          key: "scenes.3.drawing.paths",
          label: "Drawing paths (JSON array — auto-filled by Generate)",
          type: "textarea",
        },
      ],
      key: "scene3",
      label: "Scene 4 — Diagram",
    },
    {
      fields: [
        { key: "scenes.4.headline", label: "CTA headline", type: "textarea" },
        {
          key: "scenes.4.action",
          label: "Action text (phone / URL)",
          type: "text",
        },
        { key: "scenes.4.byline", label: "Byline", type: "text" },
        { key: "scenes.4.badge", label: "Badge text", type: "text" },
        {
          key: "scenes.4.narration.script",
          label: "Narration script",
          type: "textarea",
        },
        {
          key: "scenes.4.narration.audioUrl",
          label: "Audio URL (generated)",
          type: "textarea",
        },
        {
          key: "scenes.4.illustrationUrl",
          label: "Illustration URL (FAL AI)",
          type: "textarea",
        },
        {
          key: "scenes.4.drawing.prompt",
          label: "Drawing prompt (describe what to draw)",
          type: "text",
        },
        {
          key: "scenes.4.drawing.paths",
          label: "Drawing paths (JSON array — auto-filled by Generate)",
          type: "textarea",
        },
      ],
      key: "scene4",
      label: "Scene 5 — CTA",
    },
  ],

  CustomSlots: [
    {
      fields: [
        {
          key: "scenes",
          label: "Scene count (read-only — edit in Sanity schema)",
          type: "text",
        },
      ],
      key: "general",
      label: "Scenes",
    },
  ],

  HelpingTexasHomeowners: [
    helpingOpeningFields,
    helpingSceneFields(1, "Scene 2 — Roof damages"),
    helpingSceneFields(2, "Scene 3 — Water leaks"),
    helpingSceneFields(3, "Scene 4 — Cracked tiles"),
    helpingSceneFields(4, "Scene 5 — Missing shingles"),
    helpingCtaFields,
    helpingLogoFields,
  ],

  RoofScene: [
    {
      fields: [
        { key: "showCallouts", label: "Show callouts", type: "boolean" },
        { key: "showProgress", label: "Show progress dots", type: "boolean" },
        { key: "fov", label: "Field of view (degrees)", type: "number" },
        { key: "introSecs", label: "Intro duration (seconds)", type: "number" },
        {
          key: "springStiffness",
          label: "Camera spring stiffness",
          type: "number",
        },
        {
          key: "springDamping",
          label: "Camera spring damping",
          type: "number",
        },
      ],
      key: "settings",
      label: "Settings",
    },
    {
      fields: [
        {
          key: "chapters.0.durationSecs",
          label: "Duration (secs)",
          type: "number",
        },
        { key: "chapters.0.skip", label: "Skip chapter", type: "boolean" },
        {
          key: "chapters.0.camera.azimuthal",
          label: "Cam azimuthal",
          type: "number",
        },
        { key: "chapters.0.camera.polar", label: "Cam polar", type: "number" },
        {
          key: "chapters.0.camera.radius",
          label: "Cam radius",
          type: "number",
        },
        {
          key: "chapters.0.camera.targetX",
          label: "Cam target X",
          type: "number",
        },
        {
          key: "chapters.0.camera.targetY",
          label: "Cam target Y",
          type: "number",
        },
        {
          key: "chapters.0.camera.targetZ",
          label: "Cam target Z",
          type: "number",
        },
        { key: "chapters.0.hotspot.x", label: "Hotspot X", type: "number" },
        { key: "chapters.0.hotspot.y", label: "Hotspot Y", type: "number" },
        { key: "chapters.0.hotspot.z", label: "Hotspot Z", type: "number" },
        {
          key: "chapters.0.callout.title",
          label: "Callout title",
          type: "text",
        },
        {
          key: "chapters.0.callout.body",
          label: "Callout body",
          type: "textarea",
        },
        {
          key: "chapters.0.callout.watchFor",
          label: "Watch for",
          type: "textarea",
        },
      ],
      key: "chapter0",
      label: "Chapter 1 — Ridge & vent",
    },
    {
      fields: [
        {
          key: "chapters.1.durationSecs",
          label: "Duration (secs)",
          type: "number",
        },
        { key: "chapters.1.skip", label: "Skip chapter", type: "boolean" },
        {
          key: "chapters.1.camera.azimuthal",
          label: "Cam azimuthal",
          type: "number",
        },
        { key: "chapters.1.camera.polar", label: "Cam polar", type: "number" },
        {
          key: "chapters.1.camera.radius",
          label: "Cam radius",
          type: "number",
        },
        {
          key: "chapters.1.camera.targetX",
          label: "Cam target X",
          type: "number",
        },
        {
          key: "chapters.1.camera.targetY",
          label: "Cam target Y",
          type: "number",
        },
        {
          key: "chapters.1.camera.targetZ",
          label: "Cam target Z",
          type: "number",
        },
        { key: "chapters.1.hotspot.x", label: "Hotspot X", type: "number" },
        { key: "chapters.1.hotspot.y", label: "Hotspot Y", type: "number" },
        { key: "chapters.1.hotspot.z", label: "Hotspot Z", type: "number" },
        {
          key: "chapters.1.callout.title",
          label: "Callout title",
          type: "text",
        },
        {
          key: "chapters.1.callout.body",
          label: "Callout body",
          type: "textarea",
        },
        {
          key: "chapters.1.callout.watchFor",
          label: "Watch for",
          type: "textarea",
        },
      ],
      key: "chapter1",
      label: "Chapter 2 — Field shingles",
    },
    {
      fields: [
        {
          key: "chapters.2.durationSecs",
          label: "Duration (secs)",
          type: "number",
        },
        { key: "chapters.2.skip", label: "Skip chapter", type: "boolean" },
        {
          key: "chapters.2.camera.azimuthal",
          label: "Cam azimuthal",
          type: "number",
        },
        { key: "chapters.2.camera.polar", label: "Cam polar", type: "number" },
        {
          key: "chapters.2.camera.radius",
          label: "Cam radius",
          type: "number",
        },
        {
          key: "chapters.2.camera.targetX",
          label: "Cam target X",
          type: "number",
        },
        {
          key: "chapters.2.camera.targetY",
          label: "Cam target Y",
          type: "number",
        },
        {
          key: "chapters.2.camera.targetZ",
          label: "Cam target Z",
          type: "number",
        },
        { key: "chapters.2.hotspot.x", label: "Hotspot X", type: "number" },
        { key: "chapters.2.hotspot.y", label: "Hotspot Y", type: "number" },
        { key: "chapters.2.hotspot.z", label: "Hotspot Z", type: "number" },
        {
          key: "chapters.2.callout.title",
          label: "Callout title",
          type: "text",
        },
        {
          key: "chapters.2.callout.body",
          label: "Callout body",
          type: "textarea",
        },
        {
          key: "chapters.2.callout.watchFor",
          label: "Watch for",
          type: "textarea",
        },
      ],
      key: "chapter2",
      label: "Chapter 3 — Underlayment",
    },
    {
      fields: [
        {
          key: "chapters.3.durationSecs",
          label: "Duration (secs)",
          type: "number",
        },
        { key: "chapters.3.skip", label: "Skip chapter", type: "boolean" },
        {
          key: "chapters.3.camera.azimuthal",
          label: "Cam azimuthal",
          type: "number",
        },
        { key: "chapters.3.camera.polar", label: "Cam polar", type: "number" },
        {
          key: "chapters.3.camera.radius",
          label: "Cam radius",
          type: "number",
        },
        {
          key: "chapters.3.camera.targetX",
          label: "Cam target X",
          type: "number",
        },
        {
          key: "chapters.3.camera.targetY",
          label: "Cam target Y",
          type: "number",
        },
        {
          key: "chapters.3.camera.targetZ",
          label: "Cam target Z",
          type: "number",
        },
        { key: "chapters.3.hotspot.x", label: "Hotspot X", type: "number" },
        { key: "chapters.3.hotspot.y", label: "Hotspot Y", type: "number" },
        { key: "chapters.3.hotspot.z", label: "Hotspot Z", type: "number" },
        {
          key: "chapters.3.callout.title",
          label: "Callout title",
          type: "text",
        },
        {
          key: "chapters.3.callout.body",
          label: "Callout body",
          type: "textarea",
        },
        {
          key: "chapters.3.callout.watchFor",
          label: "Watch for",
          type: "textarea",
        },
      ],
      key: "chapter3",
      label: "Chapter 4 — Decking",
    },
    {
      fields: [
        {
          key: "chapters.4.durationSecs",
          label: "Duration (secs)",
          type: "number",
        },
        { key: "chapters.4.skip", label: "Skip chapter", type: "boolean" },
        {
          key: "chapters.4.camera.azimuthal",
          label: "Cam azimuthal",
          type: "number",
        },
        { key: "chapters.4.camera.polar", label: "Cam polar", type: "number" },
        {
          key: "chapters.4.camera.radius",
          label: "Cam radius",
          type: "number",
        },
        {
          key: "chapters.4.camera.targetX",
          label: "Cam target X",
          type: "number",
        },
        {
          key: "chapters.4.camera.targetY",
          label: "Cam target Y",
          type: "number",
        },
        {
          key: "chapters.4.camera.targetZ",
          label: "Cam target Z",
          type: "number",
        },
        { key: "chapters.4.hotspot.x", label: "Hotspot X", type: "number" },
        { key: "chapters.4.hotspot.y", label: "Hotspot Y", type: "number" },
        { key: "chapters.4.hotspot.z", label: "Hotspot Z", type: "number" },
        {
          key: "chapters.4.callout.title",
          label: "Callout title",
          type: "text",
        },
        {
          key: "chapters.4.callout.body",
          label: "Callout body",
          type: "textarea",
        },
        {
          key: "chapters.4.callout.watchFor",
          label: "Watch for",
          type: "textarea",
        },
      ],
      key: "chapter4",
      label: "Chapter 5 — Step flashing",
    },
    {
      fields: [
        {
          key: "chapters.5.durationSecs",
          label: "Duration (secs)",
          type: "number",
        },
        { key: "chapters.5.skip", label: "Skip chapter", type: "boolean" },
        {
          key: "chapters.5.camera.azimuthal",
          label: "Cam azimuthal",
          type: "number",
        },
        { key: "chapters.5.camera.polar", label: "Cam polar", type: "number" },
        {
          key: "chapters.5.camera.radius",
          label: "Cam radius",
          type: "number",
        },
        {
          key: "chapters.5.camera.targetX",
          label: "Cam target X",
          type: "number",
        },
        {
          key: "chapters.5.camera.targetY",
          label: "Cam target Y",
          type: "number",
        },
        {
          key: "chapters.5.camera.targetZ",
          label: "Cam target Z",
          type: "number",
        },
        { key: "chapters.5.hotspot.x", label: "Hotspot X", type: "number" },
        { key: "chapters.5.hotspot.y", label: "Hotspot Y", type: "number" },
        { key: "chapters.5.hotspot.z", label: "Hotspot Z", type: "number" },
        {
          key: "chapters.5.callout.title",
          label: "Callout title",
          type: "text",
        },
        {
          key: "chapters.5.callout.body",
          label: "Callout body",
          type: "textarea",
        },
        {
          key: "chapters.5.callout.watchFor",
          label: "Watch for",
          type: "textarea",
        },
      ],
      key: "chapter5",
      label: "Chapter 6 — Drip edge",
    },
    {
      fields: [
        {
          key: "chapters.6.durationSecs",
          label: "Duration (secs)",
          type: "number",
        },
        { key: "chapters.6.skip", label: "Skip chapter", type: "boolean" },
        {
          key: "chapters.6.camera.azimuthal",
          label: "Cam azimuthal",
          type: "number",
        },
        { key: "chapters.6.camera.polar", label: "Cam polar", type: "number" },
        {
          key: "chapters.6.camera.radius",
          label: "Cam radius",
          type: "number",
        },
        {
          key: "chapters.6.camera.targetX",
          label: "Cam target X",
          type: "number",
        },
        {
          key: "chapters.6.camera.targetY",
          label: "Cam target Y",
          type: "number",
        },
        {
          key: "chapters.6.camera.targetZ",
          label: "Cam target Z",
          type: "number",
        },
        { key: "chapters.6.hotspot.x", label: "Hotspot X", type: "number" },
        { key: "chapters.6.hotspot.y", label: "Hotspot Y", type: "number" },
        { key: "chapters.6.hotspot.z", label: "Hotspot Z", type: "number" },
        {
          key: "chapters.6.callout.title",
          label: "Callout title",
          type: "text",
        },
        {
          key: "chapters.6.callout.body",
          label: "Callout body",
          type: "textarea",
        },
        {
          key: "chapters.6.callout.watchFor",
          label: "Watch for",
          type: "textarea",
        },
      ],
      key: "chapter6",
      label: "Chapter 7 — Soffit & fascia",
    },
    {
      fields: [
        { key: "cta.trust", label: "Trust", type: "textarea" },
        { key: "cta.callout", label: "Callout", type: "textarea" },
        { key: "cta.byline", label: "Byline", type: "text" },
        { key: "cta.badge", label: "Badge", type: "text" },
        { key: "cta.durationSecs", label: "Duration (secs)", type: "number" },
      ],
      key: "cta",
      label: "CTA scene",
    },
    {
      fields: badgeFields,
      key: "badges",
      label: "Certification badges",
    },
  ],

  TandraIntro: [
    {
      fields: [
        { key: "showCaptions", label: "Show captions", type: "boolean" },
        {
          key: "showProfilePhoto",
          label: "Show profile photo",
          type: "boolean",
        },
      ],
      key: "settings",
      label: "Settings",
    },
    {
      fields: [
        { key: "content.storm.kicker", label: "Kicker", type: "text" },
        { key: "content.storm.line1", label: "Line 1", type: "text" },
        { key: "content.storm.line2", label: "Line 2", type: "text" },
        { key: "content.storm.body", label: "Body", type: "textarea" },
      ],
      key: "storm",
      label: "Opening — Storm scene",
    },
    {
      fields: [
        {
          key: "content.straightAnswers.kicker",
          label: "Kicker",
          type: "text",
        },
        { key: "content.straightAnswers.line1", label: "Line 1", type: "text" },
        { key: "content.straightAnswers.line2", label: "Line 2", type: "text" },
        { key: "content.straightAnswers.line3", label: "Line 3", type: "text" },
        {
          key: "content.straightAnswers.quote",
          label: "Quote",
          type: "textarea",
        },
      ],
      key: "straightAnswers",
      label: "Straight answers",
    },
    {
      fields: [
        { key: "content.inspection.kicker", label: "Kicker", type: "text" },
        { key: "content.inspection.line1", label: "Line 1", type: "text" },
        { key: "content.inspection.line2", label: "Line 2", type: "text" },
        { key: "content.inspection.line3", label: "Line 3", type: "text" },
        { key: "content.inspection.body", label: "Body", type: "textarea" },
      ],
      key: "inspection",
      label: "Inspection",
    },
    {
      fields: [
        { key: "content.managed.kicker", label: "Kicker", type: "text" },
        { key: "content.managed.line1", label: "Line 1", type: "text" },
        { key: "content.managed.line2", label: "Line 2", type: "text" },
        { key: "content.managed.line3", label: "Line 3", type: "text" },
      ],
      key: "managed",
      label: "Managed process",
    },
    {
      fields: [
        { key: "content.proof.kicker", label: "Kicker", type: "text" },
        { key: "content.proof.line1", label: "Line 1", type: "text" },
        { key: "content.proof.line2", label: "Line 2", type: "text" },
      ],
      key: "proof",
      label: "Proof",
    },
    {
      fields: [
        { key: "content.closing.kicker", label: "Kicker", type: "text" },
        { key: "content.closing.line1", label: "Line 1", type: "text" },
        { key: "content.closing.line2", label: "Line 2", type: "text" },
        { key: "content.closing.cta", label: "CTA", type: "text" },
      ],
      key: "closing",
      label: "Closing",
    },
  ],
  TandraRoofValue: [
    {
      fields: [
        { key: "hook.eyebrow", label: "Eyebrow", type: "text" },
        { key: "hook.headline", label: "Headline", type: "textarea" },
        { key: "hook.sub", label: "Sub", type: "textarea" },
        {
          key: "hook.image",
          label: "Background image",
          options: IMAGE_OPTIONS,
          type: "select",
        },
      ],
      key: "hook",
      label: "Hook scene",
    },
    {
      fields: [
        { key: "simple.headline", label: "Headline", type: "text" },
        { key: "simple.body", label: "Body", type: "textarea" },
        { key: "simple.showPill", label: "Show pill", type: "boolean" },
        { key: "simple.pill", label: "Pill text", type: "text" },
        {
          key: "simple.image",
          label: "Background image",
          options: IMAGE_OPTIONS,
          type: "select",
        },
      ],
      key: "simple",
      label: "Simple scene",
    },
    {
      fields: [
        { key: "benefits.lead", label: "Lead", type: "text" },
        { key: "benefits.item1", label: "Item 1", type: "text" },
        { key: "benefits.item2", label: "Item 2", type: "text" },
        { key: "benefits.item3", label: "Item 3", type: "text" },
      ],
      key: "benefits",
      label: "Benefits scene",
    },
    {
      fields: [
        { key: "intro.name", label: "Name", type: "text" },
        { key: "intro.tagline", label: "Tagline", type: "textarea" },
        { key: "intro.detail", label: "Detail", type: "textarea" },
        ...profilePhotoFields,
      ],
      key: "intro",
      label: "Intro scene",
    },
    {
      fields: [
        { key: "trust.line1", label: "Line 1", type: "text" },
        { key: "trust.line2", label: "Line 2", type: "text" },
        {
          key: "trust.hueShift",
          label: "Light leak hue shift",
          type: "number",
        },
        {
          key: "trust.style",
          label: "Light leak style (0-100)",
          type: "number",
        },
      ],
      key: "trust",
      label: "Trust scene",
    },
    {
      fields: [
        { key: "cta.setup", label: "Setup", type: "text" },
        { key: "cta.punch", label: "Punch", type: "textarea" },
        { key: "cta.action", label: "Action", type: "text" },
        { key: "cta.badge", label: "Badge", type: "text" },
        { key: "cta.byline", label: "Byline", type: "text" },
      ],
      key: "cta",
      label: "CTA scene",
    },
    {
      fields: badgeFields,
      key: "badges",
      label: "Certification badges",
    },
  ],

  TandraStormSpot: [
    {
      fields: [
        { key: "impact.eyebrow", label: "Eyebrow", type: "text" },
        { key: "impact.headline", label: "Headline", type: "textarea" },
        { key: "impact.subline", label: "Subline", type: "text" },
      ],
      key: "impact",
      label: "Impact scene",
    },
    {
      fields: [
        { key: "urgency.setup", label: "Setup", type: "text" },
        { key: "urgency.punch", label: "Punch", type: "textarea" },
      ],
      key: "urgency",
      label: "Urgency scene",
    },
    {
      fields: [
        {
          key: "intro.hueShift",
          label: "Light leak hue shift",
          type: "number",
        },
        {
          key: "intro.showProfilePhoto",
          label: "Show profile photo",
          type: "boolean",
        },
        { key: "intro.label", label: "Label", type: "text" },
        { key: "intro.nameBlock", label: "Name block", type: "textarea" },
        { key: "intro.tagline", label: "Tagline", type: "textarea" },
        {
          key: "profilePhoto.src",
          label: "Profile photo URL",
          type: "textarea",
        },
      ],
      key: "intro",
      label: "Intro scene",
    },
    {
      fields: [
        { key: "value.setup", label: "Setup", type: "text" },
        { key: "value.punch", label: "Punch", type: "textarea" },
      ],
      key: "value",
      label: "Value scene",
    },
    {
      fields: [
        { key: "cta.trust", label: "Trust", type: "textarea" },
        { key: "cta.callout", label: "Callout", type: "textarea" },
        { key: "cta.byline", label: "Byline", type: "text" },
        { key: "cta.badge", label: "Badge", type: "text" },
      ],
      key: "cta",
      label: "CTA scene",
    },
    {
      fields: badgeFields,
      key: "badges",
      label: "Certification badges",
    },
  ],
};

export function getProp(props: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".");
  let val: unknown = props;
  for (const part of parts) {
    if (val === null || typeof val !== "object") {
      return;
    }
    val = (val as Record<string, unknown>)[part];
  }
  return val;
}

export function setProp(
  props: Record<string, unknown>,
  key: string,
  value: unknown
): Record<string, unknown> {
  const parts = key.split(".");
  const result = { ...props };
  let current: unknown = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = (current as Record<string, unknown>)[part];
    if (next === null || typeof next !== "object") {
      (current as Record<string, unknown>)[part] = {};
    } else if (Array.isArray(next)) {
      (current as Record<string, unknown>)[part] = [...next];
    } else {
      (current as Record<string, unknown>)[part] = {
        ...(next as Record<string, unknown>),
      };
    }
    current = (current as Record<string, unknown>)[part];
  }
  const lastPart = parts.at(-1);
  if (lastPart !== undefined) {
    (current as Record<string, unknown>)[lastPart] = value;
  }
  return result;
}

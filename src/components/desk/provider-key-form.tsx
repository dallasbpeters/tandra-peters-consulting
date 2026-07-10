import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import { useState } from "react";
import type { FormEvent } from "react";

import { waFieldValue } from "../../lib/desk-format";
import type {
  DirectMailProviderOption,
  ProviderKeysStatusResult,
} from "../../lib/desk-types";

const ENV_LABELS: Record<string, string> = {
  LOB_API_KEY: "Lob API key",
  LOB_FROM_ADDRESS_ID: "Lob from-address ID",
  POSTALYTICS_API_KEY: "Postalytics API key",
  POSTGRID_API_KEY: "PostGrid API key",
  STANNP_API_KEY: "Stannp API key",
};

const labelFor = (name: string): string => ENV_LABELS[name] ?? name;

const fieldStatusFor = (
  status: ProviderKeysStatusResult | null,
  name: string
) => status?.keys.find((key) => key.name === name) ?? null;

export const ProviderKeyForm = ({
  onSave,
  provider,
  saving,
  status,
}: {
  onSave: (values: Record<string, string>) => void;
  provider: DirectMailProviderOption;
  saving: boolean;
  status: ProviderKeysStatusResult | null;
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const handleChange = (name: string, event: unknown) => {
    setValues((current) => ({ ...current, [name]: waFieldValue(event) }));
  };
  const canSave = provider.requiredEnv.some((name) =>
    (values[name] ?? "").trim()
  );
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(values);
  };
  return (
    <form className="desk-provider-keys" onSubmit={handleSubmit}>
      {provider.requiredEnv.map((name) => {
        const fieldStatus = fieldStatusFor(status, name);
        const placeholder = fieldStatus?.configured
          ? `Configured (${fieldStatus.hint}) — paste to replace`
          : "Paste key";
        return (
          <label className="desk-provider-keys__field" key={name}>
            <span>{labelFor(name)}</span>
            <WaInput
              autocomplete="off"
              onChange={(event) => handleChange(name, event)}
              placeholder={placeholder}
              type="password"
              value={values[name] ?? ""}
            />
            {fieldStatus?.configured ? (
              <small>
                Stored · {fieldStatus.source} · {fieldStatus.hint}
              </small>
            ) : null}
          </label>
        );
      })}
      {status && !status.secretStoreReady ? (
        <small className="desk-provider-keys__warn">
          Set DIRECT_MAIL_SECRET_KEY on the server to store keys securely.
        </small>
      ) : null}
      <WaButton
        appearance="plain"
        className="desk-action-button"
        disabled={saving || !canSave}
        type="submit"
      >
        {saving ? "Saving…" : "Save keys"}
      </WaButton>
    </form>
  );
};

import { SparksSolid } from "iconoir-react";
import { useCallback, useState } from "react";

import {
  type CalendarPlanProposal,
  channelLabels,
  type MonthRef,
  monthTitle,
} from "../../lib/content-calendar";

type AuthHeader = { Authorization: string } | null;

interface PlanAgentResponse {
  error?: string;
  ok: boolean;
  proposals?: CalendarPlanProposal[];
}

const proposalKey = (proposal: CalendarPlanProposal): string =>
  `${proposal.scheduledFor}·${proposal.channel}·${proposal.title}`;

const parsePlanResponse = async (
  response: Response
): Promise<PlanAgentResponse> => {
  try {
    return (await response.json()) as PlanAgentResponse;
  } catch {
    return {
      error: response.ok
        ? undefined
        : "The planner returned an empty response.",
      ok: response.ok,
    };
  }
};

export interface CalendarPlanPanelProps {
  authHeader: AuthHeader;
  month: MonthRef;
  /** Persist one accepted proposal. Resolves with an error message on failure. */
  onAccept: (proposal: CalendarPlanProposal) => Promise<string | null>;
}

export const CalendarPlanPanel = ({
  authHeader,
  month,
  onAccept,
}: CalendarPlanPanelProps) => {
  const [focus, setFocus] = useState("");
  const [proposals, setProposals] = useState<CalendarPlanProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!authHeader) {
      setMessage("Google sign-in is required to use the calendar agent.");
      return;
    }
    setIsGenerating(true);
    setMessage(null);
    setProposals([]);
    try {
      const response = await fetch("/api/calendar-agent", {
        body: JSON.stringify({
          focus: focus.trim() || undefined,
          month: month.month,
          year: month.year,
        }),
        headers: { ...authHeader, "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await parsePlanResponse(response);
      if (response.ok && body.ok && body.proposals) {
        setProposals(body.proposals);
        setMessage(null);
      } else {
        setMessage(body.error ?? "The planner could not build a schedule.");
      }
    } catch {
      setMessage("The planner could not be reached. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [authHeader, focus, month]);

  const accept = useCallback(
    async (proposal: CalendarPlanProposal) => {
      const key = proposalKey(proposal);
      setBusyKey(key);
      setMessage(null);
      const error = await onAccept(proposal);
      setBusyKey(null);
      if (error) {
        setMessage(error);
        return false;
      }
      setProposals((current) =>
        current.filter((item) => proposalKey(item) !== key)
      );
      return true;
    },
    [onAccept]
  );

  const acceptAll = useCallback(async () => {
    setIsAcceptingAll(true);
    // Sequential on purpose: each accept persists a Sanity draft and we stop
    // on the first failure so nothing is silently dropped.
    for (const proposal of [...proposals]) {
      // eslint-disable-next-line no-await-in-loop
      const accepted = await accept(proposal);
      if (!accepted) {
        break;
      }
    }
    setIsAcceptingAll(false);
  }, [accept, proposals]);

  return (
    <section aria-label="AI content planner" className="cal-plan">
      <div className="desk-section__heading">
        <SparksSolid aria-hidden height={22} width={22} />
        <div>
          <span>Calendar agent</span>
          <h2>Plan {monthTitle(month)} with AI</h2>
        </div>
      </div>

      <p className="cal-plan__intro">
        The agent reads Desk leads, canvassing targets, and published articles,
        then proposes a month of content in Tandra&apos;s voice. Nothing is
        saved until you accept a proposal.
      </p>

      <div className="cal-plan__controls">
        <label htmlFor="cal-plan-focus">
          <span>Focus (optional)</span>
          <input
            id="cal-plan-focus"
            maxLength={400}
            onChange={(event) => setFocus(event.currentTarget.value)}
            placeholder="Hail-season push for Georgetown roof checks"
            type="text"
            value={focus}
          />
        </label>
        <button
          className="desk-primary-link"
          disabled={isGenerating || !authHeader}
          onClick={generate}
          type="button"
        >
          <SparksSolid aria-hidden height={18} width={18} />
          {isGenerating ? "Planning..." : "Generate plan"}
        </button>
      </div>

      {authHeader ? null : (
        <p className="desk-empty">
          Google sign-in is required to use the calendar agent.
        </p>
      )}
      {message ? (
        <p className="desk-capture-message desk-capture-message--error">
          {message}
        </p>
      ) : null}
      {isGenerating ? (
        <p className="desk-empty">
          Reading Desk signals and drafting the month...
        </p>
      ) : null}

      {proposals.length > 0 ? (
        <>
          <div className="cal-plan__list-head">
            <h3>
              {proposals.length} proposal{proposals.length === 1 ? "" : "s"}
            </h3>
            <button
              className="desk-text-link"
              disabled={isAcceptingAll || busyKey !== null}
              onClick={acceptAll}
              type="button"
            >
              {isAcceptingAll ? "Adding..." : "Add all to calendar"}
            </button>
          </div>
          <ul className="cal-plan__list">
            {proposals.map((proposal) => {
              const key = proposalKey(proposal);
              return (
                <li className="cal-proposal" key={key}>
                  <div className="cal-proposal__meta">
                    <span className={`cal-chip cal-chip--${proposal.channel}`}>
                      <span className="cal-chip__channel">
                        {channelLabels[proposal.channel]}
                      </span>
                    </span>
                    <time dateTime={proposal.scheduledFor}>
                      {proposal.scheduledFor}
                    </time>
                    {proposal.area ? <span>{proposal.area}</span> : null}
                  </div>
                  <strong>{proposal.title}</strong>
                  {proposal.brief ? <p>{proposal.brief}</p> : null}
                  {proposal.targetKeyword ? (
                    <p className="cal-proposal__keyword">
                      Keyword: {proposal.targetKeyword}
                    </p>
                  ) : null}
                  <button
                    className="desk-text-link"
                    disabled={busyKey === key || isAcceptingAll}
                    onClick={() => accept(proposal)}
                    type="button"
                  >
                    {busyKey === key ? "Adding..." : "Add to calendar"}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
};

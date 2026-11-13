"use client";

import { Button, Icon, LoadState } from "@/components/ui";
import { useVaTeam } from "@/utils/hooks/useClientWork";
import { RaiseRequests } from "../components/RaiseRequests";
import { usePortal } from "../state/PortalContext";
import { TeamCard } from "./TeamSection";

/** Client portal › My VA team › VA Team: the VAs working with the business now, and their rate requests. */
export function VaTeamSection() {
  const { readOnly, goTo } = usePortal();
  const team = useVaTeam();
  const vas = team.data ?? [];
  const working = vas.filter((v) => v.workingNow).length;

  return (
    <div className="page-stack">
      <section className="card cp-team-hero">
        <span className="cp-team-hero__icon" aria-hidden="true">
          <Icon name="users" size={22} />
        </span>
        <div className="stack stack--4 u-grow">
          <strong className="cp-team-hero__title">
            {vas.length ? `${vas.length} VA${vas.length === 1 ? "" : "s"} on your team` : "No VAs on your team yet"}
          </strong>
          <span className="text-small">
            {vas.length
              ? `${working ? `${working} working for you right now. ` : "Nobody is working right now. "}Open a VA for their profile, tracker and ratings.`
              : "Once GoCWGL places a VA with your business, they show up here."}
          </span>
        </div>
        {!readOnly && (
          <Button variant="outline" onClick={() => goTo("team")}>
            <Icon name="userPlus" size={15} /> Request another VA
          </Button>
        )}
      </section>

      <RaiseRequests readOnly={readOnly} />

      <LoadState query={team} loadingText="Loading your team…">
        {vas.length > 0 ? (
          <div className="tc-grid">
            {vas.map((va) => (
              <TeamCard key={va.vaId} va={va} />
            ))}
          </div>
        ) : (
          <div className="empty-state">No VA is working with you yet. Once GoCWGL places a VA with your business, they show up here.</div>
        )}
      </LoadState>
    </div>
  );
}

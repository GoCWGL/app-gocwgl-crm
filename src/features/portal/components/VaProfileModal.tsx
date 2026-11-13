"use client";

import { Button, Icon, LoadState, Modal } from "@/components/ui";
import { ResumePaper } from "@/features/va/components/ResumePaper";
import type { SocialNetwork } from "@/features/va/lib/socials";
import { blobUrl } from "@/utils/api/client";
import { clientVaResumeDocPath } from "@/utils/api/clientWork";
import { useBlobUrl } from "@/utils/hooks/useBlobUrl";
import { useClientVaResume } from "@/utils/hooks/useClientWork";

/**
 * A VA's profile and resume, for a client reviewing a VA GoCWGL matched to their request (or one on their team).
 * Same page VAs share, without email or phone.
 */
export function VaProfileModal({ vaId, name, resumeSlug, onClose }: { vaId: string; name: string; resumeSlug?: string | null; onClose: () => void }) {
  const query = useClientVaResume(vaId);
  const r = query.data;
  const photo = useBlobUrl(r?.photoId ? clientVaResumeDocPath(vaId, r.photoId) : null);

  const openDocument = (docId: string) => {
    // Open the tab first (pop-up blockers), then point it at the file.
    const tab = window.open("", "_blank");
    blobUrl(clientVaResumeDocPath(vaId, docId))
      .then((url) => (tab ? (tab.location.href = url) : window.open(url, "_blank")))
      .catch(() => tab?.close());
  };

  return (
    <Modal
      open
      width={1080}
      onClose={onClose}
      className="vp-modal"
      titleId="va-profile"
      kicker="VA PROFILE"
      title={name}
      subtitle="Review their experience. To set up an interview or start working together, reply to GoCWGL from Request support."
      footer={
        <>
          <span className="vp-modal__note">
            <Icon name="lock" size={13} /> Contact details stay private until you work together.
          </span>
          <span className="u-spacer" />
          {resumeSlug && (
            <a className="btn btn--outline" href={`/resume/${resumeSlug}`} target="_blank" rel="noreferrer">
              Open resume page <Icon name="arrowRight" size={13} />
            </a>
          )}
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <LoadState query={query} loadingText="Loading profile…">
        {r && (
          <div className="vp-modal__paper">
            <ResumePaper
              d={{
                ...r,
                rateCents: r.rateCents ?? null,
                introVideoUrl: r.introVideoUrl ?? "",
                photoId: r.photoId ?? null,
                socialLinks: (r.socialLinks ?? []).map((l) => ({ network: l.network as SocialNetwork, url: l.url, label: l.label ?? "" })),
                workingHours: r.workingHours ?? "",
                availability: r.availability ?? "",
                yearsExperience: r.yearsExperience ?? "",
              }}
              memberSince={r.memberSince}
              updatedAt={r.updatedAt}
              openDocument={openDocument}
              pageUrl={resumeSlug && typeof window !== "undefined" ? `${window.location.origin}/resume/${resumeSlug}` : undefined}
              photoUrl={photo}
              h={r.highlights ?? null}
            />
          </div>
        )}
      </LoadState>
    </Modal>
  );
}

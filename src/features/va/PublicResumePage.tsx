"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { BrandLoader, Icon } from "@/components/ui";
import { publicResumeDocumentUrl } from "@/utils/api/vaPortal";
import { usePublicResume } from "@/utils/hooks/useVaPortal";
import { ResumePaper } from "./components/ResumePaper";
import type { SocialNetwork } from "./lib/socials";

/** /resume/<link>: a VA's resume as a client sees it. No sign-in. */
export function PublicResumePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const query = usePublicResume(slug);
  const r = query.data;

  return (
    <main className="resume-public">
      <header className="resume-public__bar">
        <Image src={logoWordmark} alt="GoCWGL" width={132} priority />
        <span className="text-small">Virtual assistant resume</span>
      </header>
      {query.isPending ? (
        <div className="resume-public__state">
          <BrandLoader title="Opening resume…" />
        </div>
      ) : !r ? (
        <div className="resume-public__state card">
          <Icon name="lock" size={22} />
          <strong>This resume isn’t available</strong>
          <span className="text-small">The link may be old, or the VA has turned their page off. Ask them for a new link.</span>
        </div>
      ) : (
        <div className="resume-public__paper">
          <ResumePaper d={{
              ...r,
              rateCents: r.rateCents ?? null,
              introVideoUrl: r.introVideoUrl ?? "",
              photoId: r.photoId ?? null,
              socialLinks: (r.socialLinks ?? []).map((l) => ({ network: l.network as SocialNetwork, url: l.url, label: l.label ?? "" })),
              workingHours: r.workingHours ?? "",
              availability: r.availability ?? "",
              yearsExperience: r.yearsExperience ?? "",
            }} memberSince={r.memberSince}
            updatedAt={r.updatedAt}
            openDocument={(docId) => window.open(publicResumeDocumentUrl(slug, docId), "_blank", "noopener")}
            pageUrl={typeof window !== "undefined" ? `${window.location.origin}/resume/${slug}` : undefined}
            photoUrl={r.photoId ? publicResumeDocumentUrl(slug, r.photoId) : null} h={r.highlights ?? null} />
        </div>
      )}
      <footer className="resume-public__foot text-small">
        Shared through <a href="https://gocwgl.com">GoCWGL</a>
      </footer>
    </main>
  );
}

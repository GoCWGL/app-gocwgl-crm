import { LANDING_COPY, MOCKUP_FEATURES } from "@/data/portal";

/** Preview of the landing page copy document (shown inside the todo drawer). */
export function CopyPreview() {
  return (
    <div className="doc-preview">
      <div className="doc-preview__label">PREVIEW · LANDING PAGE COPY v2</div>
      <div className="copy-preview">
        {LANDING_COPY.map((block) => (
          <div
            key={block.label}
            className={block.label === "HEADLINE" ? "copy-preview__block copy-preview__block--headline" : "copy-preview__block"}
          >
            <span className="kicker kicker--sm kicker--muted">{block.label}</span>
            <span className="copy-preview__text" style={{ fontSize: block.size, fontWeight: block.weight }}>
              {block.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Miniature browser window showing the landing page design. */
export function MockupPreview() {
  return (
    <div className="doc-preview">
      <div className="doc-preview__label">PREVIEW · LANDING PAGE MOCKUP</div>
      <div className="mockup">
        <div className="mockup__window">
          <div className="mockup__bar">
            <span className="mockup__light mockup__light--red" />
            <span className="mockup__light mockup__light--amber" />
            <span className="mockup__light mockup__light--green" />
            <span className="mockup__url">rahmanwellness.example</span>
          </div>
          <div className="mockup__hero">
            <div className="mockup__pitch">
              <span className="mockup__headline">Feel stronger, calmer and more like yourself.</span>
              <span className="mockup__sub">Small-group wellness classes and 1:1 coaching in a studio built around you.</span>
              <span className="mockup__cta">Book your free intro call</span>
            </div>
            <div className="mockup__form">
              <span className="mockup__form-title">Start your free week</span>
              <span className="mockup__field" />
              <span className="mockup__field" />
              <span className="mockup__submit" />
            </div>
          </div>
          <div className="mockup__features">
            {MOCKUP_FEATURES.map((f) => (
              <div className="mockup__feature" key={f}>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

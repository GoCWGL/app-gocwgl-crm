import { Icon } from "@/components/ui";

type SignedInCardProps = {
  who: string;
  email: string;
  steps: string[];
  cta: string;
  onContinue: () => void;
};

/** Final step: confirms who signed in and links to the right app. */
export function SignedInCard({ who, email, steps, cta, onContinue }: SignedInCardProps) {
  return (
    <div className="auth-done">
      <div className="auth-done__who">
        <span className="auth-done__check" aria-hidden="true">
          <Icon name="check" size={20} strokeWidth={2.6} />
        </span>
        <div className="stack stack--2">
          <span className="auth-done__name">{who}</span>
          <span className="text-muted">{email}</span>
        </div>
      </div>
      <div className="stack stack--6">
        {steps.map((step) => (
          <div className="auth-done__step" key={step}>
            <span className="auth-done__tick" aria-hidden="true">
              ✓
            </span>
            {step}
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--primary btn--lg btn--block auth-submit" onClick={onContinue}>
        {cta}
      </button>
    </div>
  );
}

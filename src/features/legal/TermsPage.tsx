import Link from "next/link";
import { LEGAL_CONTACT, LEGAL_UPDATED } from "@/data/legal";
import { LegalLayout } from "./components/LegalLayout";

/** /terms. Terms of use for the client portal and admin dashboard. */
export function TermsPage() {
  return (
    <LegalLayout kicker="// TERMS OF SERVICE" title="The ground rules." meta={`Last updated ${LEGAL_UPDATED}`}>
      <p className="legal__lead">
        These terms cover your use of the GoCWGL client portal and admin dashboard (&quot;the service&quot;). By creating
        an account or signing in, you agree to them. The specific work we do for you (scope, deliverables and price) is set
        out in your proposal or service agreement, which takes priority if the two ever disagree.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate details when you sign up and keep them up to date.</li>
        <li>
          Keep your password private. You are responsible for activity on your account, so tell us straight away at{" "}
          <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a> if you think someone else has access.
        </li>
        <li>If you invite teammates, you are responsible for what they do in your account.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>break the law, or use the service to send spam or collect data without consent;</li>
        <li>try to access accounts or data that are not yours;</li>
        <li>probe, overload or disrupt the service, or get around its security or rate limits;</li>
        <li>upload malware or content you do not have the right to share.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You own the information, files and leads in your account. You give us permission to store and process them only
        as needed to run the service and deliver your project. You confirm you have the right to share that content with
        us, including any consent needed to collect your leads&apos; details. How we handle personal data is described in
        our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Billing</h2>
      <p>
        Plans and one-time services are billed as shown when you buy them, through our payment processor. Subscriptions
        renew automatically until cancelled, and cancelling stops future charges. Refunds follow your service agreement or
        what the law requires. If a payment fails, we may pause access to paid features until it is resolved.
      </p>

      <h2>Availability</h2>
      <p>
        We work hard to keep the service running and you can check its current state on our{" "}
        <Link href="/status">status page</Link>. Like any online service it may occasionally be unavailable for
        maintenance or reasons outside our control, and we do not promise uninterrupted access.
      </p>

      <h2>Suspension and closing your account</h2>
      <p>
        You can stop using the service and ask us to close your account at any time. We may suspend or close an account
        that breaks these terms or puts the service or other users at risk; where we reasonably can, we will tell you
        first and give you a chance to export your data.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided &quot;as is&quot;. To the extent the law allows, GoCWGL is not liable for indirect or
        consequential losses such as lost profits or lost data, and our total liability for any claim is limited to the
        amount you paid us in the 12 months before it arose. Nothing in these terms limits liability that cannot be
        limited by law.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as the service changes. We will update the date at the top of this page, and tell you
        about significant changes in advance by email or in the portal. Continuing to use the service after a change
        means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
      </p>
    </LegalLayout>
  );
}

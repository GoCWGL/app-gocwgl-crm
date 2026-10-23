import { LEGAL_CONTACT, LEGAL_UPDATED } from "@/data/legal";
import { LegalLayout } from "./components/LegalLayout";

/** /privacy. Plain-language policy describing what the portal and admin app actually collect. */
export function PrivacyPage() {
  return (
    <LegalLayout kicker="// PRIVACY POLICY" title="Your data, explained plainly." meta={`Last updated ${LEGAL_UPDATED}`}>
      <p className="legal__lead">
        GoCWGL builds and runs marketing systems (funnels, lead capture, reporting) for our clients. This policy covers the
        GoCWGL client portal and admin dashboard: what we collect, why, and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address, role, and a securely hashed password. If you sign in
          with Google or Microsoft, we receive your name and email from that provider, never your password there.
        </li>
        <li>
          <strong>Business information:</strong> the details you or our team add to your account, such as contacts, intake
          answers, files, notes, links and project progress.
        </li>
        <li>
          <strong>Leads and reporting data:</strong> submissions captured by the funnels and forms we run for you, and the
          statistics built from them.
        </li>
        <li>
          <strong>Billing records:</strong> plans, invoices and payment status. Card details are handled by our payment
          processor; we never see or store full card numbers.
        </li>
        <li>
          <strong>Security records:</strong> sign-in sessions with the browser type, IP address and time, used to keep your
          account safe and to show you where you are signed in.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account and deliver the work you hired us for.</li>
        <li>To send account emails: verification codes, password resets, invitations and service notices.</li>
        <li>To bill you for the services you chose.</li>
        <li>To keep the service secure, prevent abuse and investigate problems.</li>
      </ul>
      <p>We do not sell your data, and we do not use it for advertising.</p>

      <h2>Cookies</h2>
      <p>
        We only use cookies the service needs to work: one keeps you signed in, one protects forms against cross-site
        requests, and short-lived ones carry a sign-in or two-step check in progress. There are no tracking or advertising
        cookies.
      </p>
      <p>
        If you tick <em>Keep me signed in for 30 days</em>, your sign-in cookie lasts up to 30 days. Otherwise it ends when
        you close your browser, or after 12 hours at most.
      </p>

      <h2>Who we share it with</h2>
      <p>We share data only with the services that help us run GoCWGL, and only what each one needs:</p>
      <ul>
        <li>Our hosting and database providers, which store the service&apos;s data.</li>
        <li>Our email provider, which delivers account emails.</li>
        <li>Wise, our payment provider, when you pay an invoice.</li>
        <li>Google or Microsoft, only if you choose to sign in with them or connect a calendar.</li>
      </ul>
      <p>We may also disclose information when the law requires it.</p>

      <h2>How we protect it</h2>
      <p>
        Connections are encrypted, passwords are hashed, and sensitive secrets such as two-step codes and connected
        payment or calendar credentials are encrypted at rest. Sign-in tokens are rotated on every use, and you can turn on
        two-step verification for your account.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep account and project data for as long as your account is active. Expired sign-ins, codes and one-time links
        are deleted automatically, and ended sessions are removed after 30 days. When you close your account we delete or
        anonymize your data, except records we must keep by law, such as invoices.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to show you, correct, export or delete your personal data at any time. Email{" "}
        <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a> and we will reply within 30 days.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change this policy, we will update the date at the top of this page. For significant changes we will also
        let you know by email or in the portal.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
      </p>
    </LegalLayout>
  );
}

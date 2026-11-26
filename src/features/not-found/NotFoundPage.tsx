import Image from "next/image";
import Link from "next/link";
import logoWordmark from "@/assets/images/logo-wordmark.png";
import { Icon, buttonClass } from "@/components/ui";
import { BackButton } from "./BackButton";

type NotFoundPageProps = {
  /** Set when a page shows this after its data fails to load in the browser, so the tab title changes too
   * (src/app/not-found.tsx sets it through metadata instead). */
  setTitle?: boolean;
};

export function NotFoundPage({ setTitle = false }: NotFoundPageProps) {
  return (
    <main className="not-found">
      {setTitle && <title>Page not found · GoCWGL</title>}
      <div className="not-found__glow" aria-hidden />

      <header className="not-found__bar">
        <Link href="/" aria-label="GoCWGL home">
          <Image className="not-found__logo" src={logoWordmark} alt="GoCWGL" priority />
        </Link>
      </header>

      <section className="not-found__body">
        <p className="not-found__label">{"// ERROR 404"}</p>

        <div className="not-found__code" aria-hidden>
          <span>4</span>
          <span className="not-found__zero">0</span>
          <span>4</span>
        </div>

        <h1 className="not-found__title">This page doesn&apos;t exist</h1>
        <p className="not-found__text">
          The link may be broken, or the page may have moved. Check the address, or head back to somewhere familiar.
        </p>

        <div className="not-found__actions">
          <Link href="/" className={buttonClass({ variant: "primary", size: "lg" })}>
            <Icon name="arrowRight" size={16} />
            Go to home
          </Link>
          <BackButton />
        </div>
      </section>

      <footer className="not-found__foot">
        Need help? <Link href="/status">Check system status</Link>
      </footer>
    </main>
  );
}

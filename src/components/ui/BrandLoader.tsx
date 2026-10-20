"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import logoMark from "@/assets/images/logo-mark.png";

const STEP_EVERY_MS = 1100;

type BrandLoaderProps = {
  title: string;
  /** Short lines that rotate under the bar, e.g. "Syncing pipeline". */
  steps?: readonly string[];
};

/** Branded wait: logo inside a spinning gradient ring, a sweeping bar and rotating status lines. */
export function BrandLoader({ title, steps = [] }: BrandLoaderProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (steps.length < 2) return;
    const id = setInterval(() => setStep((i) => (i + 1) % steps.length), STEP_EVERY_MS);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className="brand-loader">
      <div className="brand-loader__mark" aria-hidden="true">
        <span className="brand-loader__ripple" />
        <span className="brand-loader__ring" />
        <Image className="brand-loader__logo" src={logoMark} alt="" width={56} height={56} priority />
      </div>
      <p className="brand-loader__title">{title}</p>
      <div className="brand-loader__track" aria-hidden="true">
        <span className="brand-loader__bar" />
      </div>
      {steps.length > 0 && (
        <p className="brand-loader__step" key={step}>
          {steps[step % steps.length]}
        </p>
      )}
    </div>
  );
}

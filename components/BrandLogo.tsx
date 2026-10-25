"use client";
import { useEffect, useRef, useState } from "react";

const REMOTE = "https://biglanguage.com/wp-content/uploads/2021/12/BIGLS_Logo_Horizontal-.png";
const LOCAL = "/brand/BIGLS_Logo_Horizontal.png"; // unmodified copy of the same file

/** Official BIG Language Solutions logo. Loads from biglanguage.com and falls back to the local copy if that fails. */
export default function BrandLogo({ className = "bls-company-logo" }: { className?: string }) {
  const [src, setSrc] = useState(REMOTE);
  const ref = useRef<HTMLImageElement>(null);
  // An error that happens before React hydrates never reaches onError, so check once after mount.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && img.getAttribute("src") === REMOTE) setSrc(LOCAL);
  }, []);
  return (
    // A plain <img> keeps the original file untouched (no Next.js image re-encoding) and needs no remote-host config.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt="BIG Language Solutions logo"
      width={1629}
      height={595}
      className={className}
      decoding="async"
      onError={() => { if (src !== LOCAL) setSrc(LOCAL); }}
    />
  );
}

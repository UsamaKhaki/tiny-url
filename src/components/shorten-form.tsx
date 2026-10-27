"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

type ShortLink = {
  slug: string;
  shortUrl: string;
  url: string;
  clicks: number;
  createdAt: string;
  expiresAt: string | null;
};

const EXPIRY_OPTIONS = [
  { label: "Never", value: "" },
  { label: "1 day", value: "1" },
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "1 year", value: "365" },
];

export function ShortenForm({ host }: { host: string }) {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [expiry, setExpiry] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const source = useMemo(() => {
    if (!result) return "";
    try {
      const parsed = new URL(result.url);
      return parsed.host + (parsed.pathname === "/" ? "" : parsed.pathname);
    } catch {
      return result.url;
    }
  }, [result]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          slug: slug.trim() || undefined,
          expiresInDays: expiry || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      setResult(data);
      setQr(null);
      setSlug("");
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      );
    } catch {
      setError("Can't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
    } catch {
      setError("Your browser blocked the clipboard. Copy the link manually.");
    }
  }

  async function toggleQr() {
    if (!result) return;
    if (qr) {
      setQr(null);
      return;
    }
    setQr(
      await QRCode.toDataURL(result.shortUrl, {
        margin: 1,
        width: 264,
        color: { dark: "#0d1428", light: "#ffffff" },
      }),
    );
  }

  return (
    <>
      <form className="console" onSubmit={onSubmit}>
        <div className="console-head">
          <span>New short link</span>
          <span>{host}/·······</span>
        </div>

        <div className="console-body">
          <div className="field">
            <label htmlFor="url">Destination</label>
            <div className="control">
              <input
                id="url"
                name="url"
                type="text"
                inputMode="url"
                autoComplete="off"
                placeholder="https://example.com/a/very/long/address"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="slug">Custom alias — optional</label>
              <div className="control">
                <span className="control-prefix">{host}/</span>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="spring-sale"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="expiry">Expires</label>
              <div className="control">
                <select
                  id="expiry"
                  name="expiry"
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div>
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Shortening…" : "Shorten link"}
            </button>
          </div>
        </div>
      </form>

      {result && (
        <div className="result" ref={resultRef} aria-live="polite">
          <div className="trace">
            <div className="trace-node">
              <span>Destination</span>
              <p title={result.url}>{source}</p>
            </div>
            <div className="trace-wire" aria-hidden="true">
              <i className="trace-pulse" />
            </div>
            <div className="trace-node dest">
              <span>Short link</span>
              <p>
                {host}/{result.slug}
              </p>
            </div>
          </div>

          <div className="result-actions">
            <button className="btn btn-quiet" type="button" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button className="btn btn-quiet" type="button" onClick={toggleQr}>
              {qr ? "Hide QR" : "QR code"}
            </button>
            <Link className="btn btn-quiet" href={`/stats/${result.slug}`}>
              Stats
            </Link>
            <a
              className="btn btn-quiet"
              href={result.shortUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
            <span className="spacer">
              {result.expiresAt
                ? `Expires ${new Date(result.expiresAt).toLocaleDateString()}`
                : "No expiry"}
            </span>
          </div>

          {qr && (
            <div className="qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR code for ${result.shortUrl}`} />
              <p>
                Point a camera at this to open {host}/{result.slug}. Right-click the code
                to save it for print.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

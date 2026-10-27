"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { deleteLink, updateLink, type LinkState } from "@/lib/actions/links";

export type DashboardLink = {
  slug: string;
  url: string;
  clicks: number;
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
};

const EXPIRY_OPTIONS = [
  { label: "Keep as is", value: "keep" },
  { label: "Never expire", value: "never" },
  { label: "1 day from now", value: "1" },
  { label: "7 days from now", value: "7" },
  { label: "30 days from now", value: "30" },
  { label: "1 year from now", value: "365" },
];

const INITIAL: LinkState = { ok: false, error: null };

export function LinkRow({ link, baseUrl }: { link: DashboardLink; baseUrl: string }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const [saveState, saveAction, saving] = useActionState(updateLink, INITIAL);
  const [removeState, removeAction, removing] = useActionState(deleteLink, INITIAL);

  // Close the editor the moment a save comes back clean, without an effect round-trip.
  const [lastSave, setLastSave] = useState(saveState);
  if (saveState !== lastSave) {
    setLastSave(saveState);
    if (saveState.ok) setEditing(false);
  }

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const status = link.expired
    ? "Expired"
    : link.expiresAt
      ? `Expires ${new Date(link.expiresAt).toLocaleDateString()}`
      : "Live";

  async function copy() {
    await navigator.clipboard.writeText(`${baseUrl}/${link.slug}`);
    setCopied(true);
  }

  return (
    <li className={`row-card${link.expired ? " is-expired" : ""}`}>
      <div className="row-main">
        <div className="row-id">
          <a className="row-slug" href={`/${link.slug}`} target="_blank" rel="noreferrer">
            /{link.slug}
          </a>
          <p className="row-url" title={link.url}>
            {link.url}
          </p>
        </div>

        <div className="row-metrics">
          <span className="row-clicks">
            <strong>{link.clicks.toLocaleString()}</strong> {link.clicks === 1 ? "click" : "clicks"}
          </span>
          <span className={`row-status${link.expired ? " expired" : ""}`}>{status}</span>
        </div>
      </div>

      <div className="row-actions">
        <button className="btn btn-quiet" type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <Link className="btn btn-quiet" href={`/stats/${link.slug}`}>
          Stats
        </Link>
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => setEditing((open) => !open)}
          aria-expanded={editing}
        >
          {editing ? "Cancel" : "Edit"}
        </button>

        {confirming ? (
          <form action={removeAction} className="inline-form">
            <input type="hidden" name="slug" value={link.slug} />
            <button className="btn btn-danger" type="submit" disabled={removing}>
              {removing ? "Deleting…" : "Delete for good"}
            </button>
            <button
              className="btn btn-quiet"
              type="button"
              onClick={() => setConfirming(false)}
            >
              Keep
            </button>
          </form>
        ) : (
          <button
            className="btn btn-quiet"
            type="button"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>

      {removeState.error && (
        <p className="error" role="alert">
          {removeState.error}
        </p>
      )}

      {editing && (
        <form className="row-edit" action={saveAction}>
          <input type="hidden" name="slug" value={link.slug} />

          <div className="field">
            <label htmlFor={`url-${link.slug}`}>Destination</label>
            <div className="control">
              <input
                id={`url-${link.slug}`}
                name="url"
                type="text"
                defaultValue={link.url}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor={`expiry-${link.slug}`}>Expiry — {status.toLowerCase()}</label>
            <div className="control">
              <select id={`expiry-${link.slug}`} name="expiry" defaultValue="keep">
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {saveState.error && (
            <p className="error" role="alert">
              {saveState.error}
            </p>
          )}

          <div>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LookupForm({ host }: { host: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const slug = code.trim().replace(/^.*\//, "");
    if (slug) router.push(`/stats/${encodeURIComponent(slug)}`);
  }

  return (
    <form className="console" id="lookup" onSubmit={onSubmit}>
      <div className="console-head">
        <span>Look up a link</span>
        <span>Clicks, destination, expiry</span>
      </div>
      <div className="console-body">
        <div className="field">
          <label htmlFor="code">Short code</label>
          <div className="control">
            <span className="control-prefix">{host}/</span>
            <input
              id="code"
              name="code"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="k3mQx9p"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <button className="btn" type="submit">
            Show stats
          </button>
        </div>
      </div>
    </form>
  );
}

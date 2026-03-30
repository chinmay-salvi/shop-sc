"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { getToken } from "../lib/auth";

function asNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ProfileCompletedSalesValue() {
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    apiFetch("/rewards/me", { signal: ac.signal })
      .then((d) => setSales(asNum(d?.sales)))
      .catch(() => setSales(null))
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  return loading ? "…" : sales ?? "—";
}


"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LiveResults } from "@/lib/types";

export function useRealtimeResults() {
  const [data, setData] = useState<LiveResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | null>(null);

  const fetchResults = useCallback(async (withFlash = false) => {
    try {
      const supabase = createClient();
      const { data: payload, error: rpcError } = await supabase.rpc("get_live_results");
      if (rpcError) throw rpcError;
      setData(payload as LiveResults);
      setError(null);
      if (withFlash) setFlashKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load results");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const start = window.setTimeout(() => {
      void fetchResults(false);
    }, 0);

    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Supabase is not configured";
      window.setTimeout(() => {
        setError(message);
        setLoading(false);
      }, 0);
      window.clearTimeout(start);
      return;
    }

    const schedule = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        void fetchResults(true);
      }, 280);
    };

    const channel = supabase
      .channel("results")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "count_rounds" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "count_entries" },
        schedule,
      )
      .subscribe();

    return () => {
      window.clearTimeout(start);
      if (timer.current) window.clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [fetchResults]);

  return { data, error, loading, flashKey, refresh: fetchResults };
}

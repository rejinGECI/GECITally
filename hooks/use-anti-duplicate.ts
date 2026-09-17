"use client";

import { useCallback, useRef, useState } from "react";

export function useAntiDuplicate() {
  const lock = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setIsSubmitting(true);
    try {
      return await fn();
    } finally {
      lock.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, run };
}

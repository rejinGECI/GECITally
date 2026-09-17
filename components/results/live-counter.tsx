"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export function LiveCounter({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(value, { stiffness: 90, damping: 18, mass: 0.6 });
  const display = useTransform(spring, (latest) => Math.round(latest).toLocaleString("en-IN"));
  const [text, setText] = useState(value.toLocaleString("en-IN"));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", setText);
    return unsubscribe;
  }, [display]);

  return (
    <motion.span layout className={className}>
      {text}
    </motion.span>
  );
}

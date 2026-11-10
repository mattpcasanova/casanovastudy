"use client"

import { useEffect, useState } from "react"

/**
 * Counts from 0 up to `value` once when it first shows (a results screen's
 * score). People who ask for reduced motion get the number at once.
 */
export function useCountUp(value: number, ms = 800): number {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || value <= 0) {
      setShown(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      // Ease out: fast at first, settling on the score.
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, ms])
  return shown
}

"use client"

// Name order for teacher lists (class results, gradebook, assigned practice):
// last name by default, the same choice on every page (localStorage
// 'cs:sort:name-order').

import { useCallback, useEffect, useState } from "react"
import type { NameOrder } from "@/lib/grading/names"

const KEY = "cs:sort:name-order"

export function useNameOrder(): [NameOrder, (o: NameOrder) => void] {
  const [order, setOrder] = useState<NameOrder>("last")
  useEffect(() => {
    try { if (localStorage.getItem(KEY) === "first") setOrder("first") } catch {}
  }, [])
  const set = useCallback((o: NameOrder) => {
    setOrder(o)
    try { localStorage.setItem(KEY, o) } catch {}
  }, [])
  return [order, set]
}

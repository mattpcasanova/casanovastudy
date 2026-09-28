"use client"

import { forwardRef, useCallback, useLayoutEffect, useRef } from "react"
import { cn } from "@/lib/utils"

// Shared inline-editing primitives for the custom guide editor. Everything on
// the canvas is edited "in place" (Notion-style): borderless fields that only
// reveal a surface on hover/focus, so the editor reads like the finished guide
// instead of a stack of form cards.

export const inlineField =
  "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-slate-800 placeholder:text-slate-400 " +
  "transition-[background-color,border-color,box-shadow] duration-150 outline-none " +
  "hover:bg-slate-50 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100"

export const fieldLabel = "text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400"

type InlineInputProps = React.InputHTMLAttributes<HTMLInputElement>

export const InlineInput = forwardRef<HTMLInputElement, InlineInputProps>(function InlineInput(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(inlineField, className)} {...props} />
})

type AutoTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number
}

// Textarea that grows with its content (no inner scrollbar, no manual resize
// handle). Measured in a layout effect so there's no one-frame jump.
export const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(function AutoTextarea(
  { className, minRows = 1, value, ...props },
  forwardedRef
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)

  const setRefs = useCallback((node: HTMLTextAreaElement | null) => {
    innerRef.current = node
    if (typeof forwardedRef === "function") forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }, [forwardedRef])

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])

  // Re-measure when the width changes (sidebar/viewport resize re-wraps lines).
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    let lastWidth = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return
      lastWidth = el.clientWidth
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight + 2}px`
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <textarea
      ref={setRefs}
      rows={minRows}
      value={value}
      className={cn(inlineField, "resize-none overflow-hidden leading-relaxed", className)}
      {...props}
    />
  )
})

// Small segmented control used for block-level options (question type, callout
// variant, etc.) — replaces the full-width Select dropdowns that cluttered blocks.
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "sm",
  className,
}: {
  value: T
  options: { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[]
  onChange: (value: T) => void
  size?: "sm" | "xs"
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      className={cn("inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-100 p-0.5", className)}
    >
      {options.map(opt => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-150",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[0.7rem]",
              active
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// Row of color dots (definition color, table header tint).
export function ColorDots<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; swatch: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          aria-label={opt.label}
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-4 w-4 rounded-full ring-offset-2 transition-transform duration-150 hover:scale-110",
            opt.swatch,
            opt.value === value ? "ring-2 ring-slate-400" : "ring-0"
          )}
        />
      ))}
    </div>
  )
}

// Quiet "add" affordance used at the bottom of list-like blocks.
export function AddRowButton({
  onClick,
  children,
  className,
}: {
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600",
        className
      )}
    >
      {children}
    </button>
  )
}

// Focus a freshly-added row on the next frame (after React commits it).
export function focusLater(getEl: () => HTMLElement | null | undefined) {
  requestAnimationFrame(() => getEl()?.focus())
}

"use client"

// Profile avatars: preset icon + color ("cat:violet"), saved as
// user_profiles.avatar (migration 073). No uploads, so nothing to moderate.
// UserAvatar falls back to initials when none is picked.

import { useState } from "react"
import {
  Anchor, Atom, Bike, Bird, Cat, Code, Cookie, Crown, Dna, Dog, Feather, Fish, FlaskConical, Flower2, Gamepad2, Ghost,
  Globe, Guitar, Headphones, IceCreamCone, Leaf, Moon, Mountain, Music, Palette, Panda, Pizza, Rabbit, Rocket, Shell,
  Snail, Squirrel, Sun, Telescope, Trophy, Turtle, Volleyball, Zap, type LucideIcon,
} from "lucide-react"
import { Check, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

export const AVATAR_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  cat: { icon: Cat, label: "Cat" }, dog: { icon: Dog, label: "Dog" }, panda: { icon: Panda, label: "Panda" }, rabbit: { icon: Rabbit, label: "Rabbit" },
  bird: { icon: Bird, label: "Bird" }, fish: { icon: Fish, label: "Fish" }, turtle: { icon: Turtle, label: "Turtle" }, squirrel: { icon: Squirrel, label: "Squirrel" },
  snail: { icon: Snail, label: "Snail" }, shell: { icon: Shell, label: "Shell" }, feather: { icon: Feather, label: "Feather" }, leaf: { icon: Leaf, label: "Leaf" },
  flower: { icon: Flower2, label: "Flower" }, mountain: { icon: Mountain, label: "Mountain" }, sun: { icon: Sun, label: "Sun" }, moon: { icon: Moon, label: "Moon" },
  globe: { icon: Globe, label: "Globe" }, rocket: { icon: Rocket, label: "Rocket" }, telescope: { icon: Telescope, label: "Telescope" }, atom: { icon: Atom, label: "Atom" },
  dna: { icon: Dna, label: "DNA" }, flask: { icon: FlaskConical, label: "Flask" }, code: { icon: Code, label: "Code" }, zap: { icon: Zap, label: "Lightning" },
  music: { icon: Music, label: "Music" }, guitar: { icon: Guitar, label: "Guitar" }, headphones: { icon: Headphones, label: "Headphones" }, palette: { icon: Palette, label: "Paint" },
  gamepad: { icon: Gamepad2, label: "Game controller" }, volleyball: { icon: Volleyball, label: "Ball" }, bike: { icon: Bike, label: "Bike" }, trophy: { icon: Trophy, label: "Trophy" },
  crown: { icon: Crown, label: "Crown" }, anchor: { icon: Anchor, label: "Anchor" }, ghost: { icon: Ghost, label: "Ghost" }, pizza: { icon: Pizza, label: "Pizza" },
  icecream: { icon: IceCreamCone, label: "Ice cream" }, cookie: { icon: Cookie, label: "Cookie" },
}

// Class strings are literal so Tailwind keeps them; 700 shades keep white icons readable.
export const AVATAR_COLORS: Record<string, { bg: string; label: string }> = {
  blue: { bg: "bg-blue-700", label: "Blue" },
  sky: { bg: "bg-sky-700", label: "Sky" },
  teal: { bg: "bg-teal-700", label: "Teal" },
  green: { bg: "bg-green-700", label: "Green" },
  amber: { bg: "bg-amber-700", label: "Amber" },
  orange: { bg: "bg-orange-700", label: "Orange" },
  rose: { bg: "bg-rose-700", label: "Rose" },
  pink: { bg: "bg-pink-700", label: "Pink" },
  violet: { bg: "bg-violet-700", label: "Violet" },
  slate: { bg: "bg-slate-700", label: "Gray" },
}

export function parseAvatar(value?: string | null): { icon: string; color: string } | null {
  const [icon, color] = (value ?? "").split(":")
  return icon && color && AVATAR_ICONS[icon] && AVATAR_COLORS[color] ? { icon, color } : null
}

function initialsOf(user: { email: string; first_name?: string; last_name?: string }): string {
  if (user.first_name && user.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  if (user.first_name) return user.first_name.slice(0, 2).toUpperCase()
  return user.email.split("@")[0].slice(0, 2).toUpperCase() || "?"
}

/** The user's avatar, or initials on white when they haven't picked one. */
export function UserAvatar({ user, className, iconClassName }: { user: { email: string; first_name?: string; last_name?: string; avatar?: string | null }; className?: string; iconClassName?: string }) {
  const a = parseAvatar(user.avatar)
  if (!a) return <span className={cn("flex items-center justify-center rounded-full bg-white font-bold text-primary", className)}>{initialsOf(user)}</span>
  const Icon = AVATAR_ICONS[a.icon].icon
  return (
    <span className={cn("flex items-center justify-center rounded-full text-white", AVATAR_COLORS[a.color].bg, className)}>
      <Icon className={cn("h-1/2 w-1/2", iconClassName)} aria-hidden />
    </span>
  )
}

/** Pick an icon and a color; saves to the signed-in user's own profile row. */
export function AvatarPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, refreshProfile } = useAuth()
  const current = parseAvatar(user?.avatar)
  const [icon, setIcon] = useState(current?.icon ?? "cat")
  const [color, setColor] = useState(current?.color ?? "blue")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [opened, setOpened] = useState(open)
  if (open !== opened) {
    setOpened(open)
    if (open) { setIcon(current?.icon ?? "cat"); setColor(current?.color ?? "blue"); setError("") }
  }
  if (!user) return null

  const save = async (value: string | null) => {
    setSaving(true)
    setError("")
    const { error: dbError } = await supabase.from("user_profiles").update({ avatar: value }).eq("id", user.id)
    if (dbError) { setError("Couldn't save your avatar. Try again."); setSaving(false); return }
    await refreshProfile()
    setSaving(false)
    onOpenChange(false)
  }

  const Preview = AVATAR_ICONS[icon].icon
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose your avatar</DialogTitle>
          <DialogDescription>Pick a picture and a color. It shows in the menu at the top.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <span className={cn("flex h-20 w-20 items-center justify-center rounded-full text-white shadow-md", AVATAR_COLORS[color].bg)}>
            <Preview className="h-10 w-10" aria-hidden />
          </span>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-800">Picture</legend>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {Object.entries(AVATAR_ICONS).map(([key, { icon: Icon, label }]) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className={cn("flex aspect-square items-center justify-center rounded-xl ring-1 transition", icon === key ? "bg-blue-700 text-white ring-2 ring-blue-700" : "bg-white text-slate-600 ring-slate-200 hover:ring-blue-300")}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-800">Color</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(AVATAR_COLORS).map(([key, { bg, label }]) => (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={color === key}
                onClick={() => setColor(key)}
                className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white transition", bg, color === key ? "ring-4 ring-blue-300 ring-offset-2" : "hover:scale-105")}
              >
                {color === key && <Check className="h-5 w-5" aria-hidden />}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {current ? (
            <button type="button" className={actionButton} disabled={saving} onClick={() => void save(null)}>Use my initials</button>
          ) : <span />}
          <button type="button" className={actionButtonPrimary} disabled={saving} onClick={() => void save(`${icon}:${color}`)}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

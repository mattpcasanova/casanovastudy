import { describe, expect, it } from "vitest"
import { materialMatches, shelfGroups } from "./material-shelf"

const m = (n: number, classId: string, name = `File ${n}.pptx`, note: string | null = null) =>
  ({ id: `l${n}`, materialId: `m${n}`, name, note, classId, createdAt: `2026-10-${String(n).padStart(2, "0")}T00:00:00Z` })

describe("materialMatches", () => {
  it("matches words in any order, in the name or the note, ignoring accents and underscores", () => {
    const x = { name: "Unit_4_Equilibrium.pptx", note: "Para el examen" }
    expect(materialMatches(x, "equilibrium unit")).toBe(true)
    expect(materialMatches(x, "unit 4")).toBe(true)
    expect(materialMatches(x, "exámen")).toBe(true)
    expect(materialMatches(x, "kinetics")).toBe(false)
    expect(materialMatches(x, "  ")).toBe(true)
  })
})

describe("shelfGroups", () => {
  const files = [m(1, "a"), m(2, "a"), m(3, "a"), m(4, "a"), m(5, "a", "Unit 5 Kinetics.pptx"), m(6, "b"), m(7, "c", "Chapter 7.pdf", "Unit 5")]

  it("groups by class in the given order, newest first, folded to the newest few", () => {
    const g = shelfGroups(files, ["b", "a", "zz"], { perClass: 3 })
    expect(g.map((x) => x.classId)).toEqual(["b", "a"])
    expect(g[1].items.map((x) => x.id)).toEqual(["l5", "l4", "l3"])
    expect(g[1].hidden).toBe(2)
    expect(g[0].hidden).toBe(0)
  })

  it("shows everything for an expanded class", () => {
    const g = shelfGroups(files, ["a"], { perClass: 3, expanded: new Set(["a"]) })
    expect(g[0].items).toHaveLength(5)
    expect(g[0].hidden).toBe(0)
  })

  it("narrows to one class", () => {
    expect(shelfGroups(files, ["a", "b", "c"], { only: "c" }).map((x) => x.classId)).toEqual(["c"])
  })

  it("a query searches every class, unfolded, and drops empty classes", () => {
    const g = shelfGroups(files, ["a", "b", "c"], { query: "unit 5", perClass: 1 })
    expect(g.map((x) => [x.classId, x.items.map((i) => i.id), x.hidden])).toEqual([["a", ["l5"], 0], ["c", ["l7"], 0]])
  })
})

"use client"

import { use, useEffect, useMemo, useState } from "react"
import { BigIdeaBars } from "@/components/practice-tests/big-idea-bars"
import {
  AnswerLetter,
  BigIdeaBreakdown,
  PracticeTestPublicMeta,
  QuestionContentItem,
  StemContent,
} from "@/lib/types/practice-test"

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"]

// Stem range labels — used as grid section dividers in the index view.
function buildStemRangeLabels(questions: QuestionContentItem[]): Record<number, string> {
  const labels: Record<number, string> = {}
  let prevStem: string | undefined
  let stemStart = 0
  for (const q of questions) {
    const stem = q.stem
    if (stem && stem !== prevStem) {
      stemStart = q.n
      labels[q.n] = `Stem · Q${stemStart}…`
      prevStem = stem
    } else if (!stem && prevStem) {
      prevStem = undefined
    }
  }
  return labels
}

function ChoicesAreText({
  choice,
  letter,
  selected,
  onClick,
}: {
  choice: unknown
  letter: AnswerLetter
  selected: boolean
  onClick: () => void
}) {
  return (
    <div
      className={`pt-choice ${selected ? "pt-choice-selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick() }
      }}
    >
      <span className="pt-letter">{letter}</span>
      {Array.isArray(choice) ? (
        <table className="pt-choice-table">
          <tbody>
            <tr>{(choice[0] as string[]).map((h: string, i: number) => (
              <th key={i} dangerouslySetInnerHTML={{ __html: h }} />
            ))}</tr>
            <tr>{(choice[1] as string[]).map((c: string, i: number) => (
              <td key={i} dangerouslySetInnerHTML={{ __html: c }} />
            ))}</tr>
          </tbody>
        </table>
      ) : (
        <span dangerouslySetInnerHTML={{ __html: String(choice) }} />
      )}
    </div>
  )
}

export default function StudentTakePage({
  params,
}: {
  params: Promise<{ shareToken: string }>
}) {
  const { shareToken } = use(params)
  const [meta, setMeta] = useState<PracticeTestPublicMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [studentName, setStudentName] = useState("")
  const [nameLocked, setNameLocked] = useState(false)
  const [view, setView] = useState<"grid" | "q">("grid")
  const [currentIdx, setCurrentIdx] = useState(0)
  const [responses, setResponses] = useState<Record<string, AnswerLetter>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    scoreTotal: number
    scoreMax: number
    bigIdeaBreakdown: BigIdeaBreakdown
  } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/practice-tests/take/${shareToken}`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error ?? "Could not load this practice test")
          return
        }
        setMeta(json)
      } catch {
        if (!cancelled) setError("Network error — check your connection and refresh")
      }
    }
    load()
    return () => { cancelled = true }
  }, [shareToken])

  const questions: QuestionContentItem[] = meta?.questions_content?.questions ?? []
  const stems: Record<string, StemContent> = meta?.questions_content?.stems ?? {}
  const stemRangeLabels = useMemo(() => buildStemRangeLabels(questions), [questions])
  const totalQuestions = questions.length
  const allAnswered = totalQuestions > 0 && questions.every(q => responses[String(q.n)])
  const answeredCount = Object.keys(responses).length

  // Keyboard nav in question view.
  useEffect(() => {
    if (view !== "q") return
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && currentIdx > 0) setCurrentIdx(i => i - 1)
      if (e.key === "ArrowRight" && currentIdx < totalQuestions - 1) setCurrentIdx(i => i + 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [view, currentIdx, totalQuestions])

  const onChoose = (qNum: number, letter: AnswerLetter) => {
    setResponses(prev => ({ ...prev, [String(qNum)]: letter }))
  }

  const onSubmit = async () => {
    if (!studentName.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/practice-tests/take/${shareToken}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: studentName.trim(), responses }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error ?? "Failed to submit")
        return
      }
      setResult({
        scoreTotal: json.scoreTotal,
        scoreMax: json.scoreMax,
        bigIdeaBreakdown: json.bigIdeaBreakdown,
      })
    } catch {
      setSubmitError("Network error — please try again")
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="pt-shell">
        <Style />
        <div className="pt-card pt-error">
          <h1>Practice test unavailable</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!meta) {
    return (
      <div className="pt-shell">
        <Style />
        <div className="pt-card"><p style={{ textAlign: "center" }}>Loading…</p></div>
      </div>
    )
  }

  // Result screen
  if (result) {
    const pct = result.scoreMax > 0 ? (result.scoreTotal / result.scoreMax) * 100 : 0
    return (
      <div className="pt-shell">
        <Style />
        <header className="pt-masthead">
          <div>
            <h1>{meta.title}</h1>
            <div className="pt-subtitle">Submitted by {studentName}</div>
          </div>
        </header>
        <div className="pt-card">
          <h2 className="pt-section-title">Your score</h2>
          <div className="pt-score">
            {result.scoreTotal}<span className="pt-score-sep">/</span>{result.scoreMax}
            <span className="pt-score-pct">· {pct.toFixed(0)}%</span>
          </div>
          <div style={{ marginTop: 24 }}>
            <h2 className="pt-section-title">Performance by Big Idea</h2>
            <div className="pt-bg-light">
              <BigIdeaBars breakdown={result.bigIdeaBreakdown} sortByWeakest={false} />
            </div>
          </div>
          <p className="pt-footer-note">Your responses have been recorded. Close this tab when you're done.</p>
        </div>
      </div>
    )
  }

  // Name gate
  if (!nameLocked) {
    return (
      <div className="pt-shell">
        <Style />
        <header className="pt-masthead">
          <div>
            <h1>{meta.title}</h1>
            {meta.description && <div className="pt-subtitle">{meta.description}</div>}
          </div>
        </header>
        <div className="pt-card">
          <h2 className="pt-section-title">Before you begin</h2>
          <p style={{ marginBottom: 16 }}>Enter your full name so your teacher can identify your submission.</p>
          <input
            className="pt-name-input"
            type="text"
            placeholder="First and last name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            maxLength={80}
            autoFocus
          />
          <button
            className="pt-primary-btn"
            disabled={!studentName.trim()}
            onClick={() => setNameLocked(true)}
            style={{ marginTop: 12 }}
          >
            Start practice test →
          </button>
        </div>
      </div>
    )
  }

  // Quiz body
  const q = questions[currentIdx]

  return (
    <div className="pt-shell">
      <Style />
      <header className="pt-masthead">
        <div>
          <h1>{meta.title}</h1>
          <div className="pt-subtitle">
            {totalQuestions} question{totalQuestions === 1 ? "" : "s"} · {studentName}
          </div>
        </div>
        <div className="pt-meta">
          <div className="pt-meta-label">Answered</div>
          <div>{answeredCount}/{totalQuestions}</div>
        </div>
      </header>

      <div className="pt-view-toggle">
        <button className={view === "grid" ? "pt-active" : ""} onClick={() => setView("grid")}>Question Index</button>
        <button className={view === "q" ? "pt-active" : ""} onClick={() => setView("q")}>Single Question</button>
      </div>

      {view === "grid" ? (
        <div>
          <p className="pt-grid-hint">
            Click any number to jump. ★ marks questions sharing a passage. Already-answered questions are highlighted.
          </p>
          <div className="pt-qgrid">
            {questions.map((qq, idx) => (
              <div key={qq.n} style={{ display: "contents" }}>
                {stemRangeLabels[qq.n] && (
                  <div className="pt-set-divider">{stemRangeLabels[qq.n]}</div>
                )}
                <button
                  className={`${qq.stem ? "pt-set-marker" : ""} ${responses[String(qq.n)] ? "pt-grid-answered" : ""}`}
                  onClick={() => { setCurrentIdx(idx); setView("q") }}
                >
                  {qq.n}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        q && (
          <>
            <div className="pt-qnav">
              <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>← Previous</button>
              <div className="pt-qcounter">
                Question{" "}
                <input
                  type="number"
                  min={1}
                  max={totalQuestions}
                  value={q.n}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    const idx = questions.findIndex(qq => qq.n === n)
                    if (idx >= 0) setCurrentIdx(idx)
                  }}
                />{" "}
                of {totalQuestions}
              </div>
              <button onClick={() => setCurrentIdx(i => Math.min(totalQuestions - 1, i + 1))} disabled={currentIdx === totalQuestions - 1}>Next →</button>
            </div>

            <div className="pt-card">
              {q.stem && stems[q.stem] && (
                <div className="pt-stem-context">
                  <span className="pt-stem-label">{stems[q.stem].title}</span>
                  <span dangerouslySetInnerHTML={{ __html: stems[q.stem].body }} />
                </div>
              )}
              <div className="pt-q-number">{q.n}</div>
              <div className="pt-q-prompt" dangerouslySetInnerHTML={{ __html: q.prompt }} />
              {q.figure && (
                <div className="pt-q-figure" dangerouslySetInnerHTML={{ __html: q.figure }} />
              )}
              <div className="pt-choices">
                {q.choices.map((c, i) => (
                  <ChoicesAreText
                    key={i}
                    choice={c}
                    letter={LETTERS[i]}
                    selected={responses[String(q.n)] === LETTERS[i]}
                    onClick={() => onChoose(q.n, LETTERS[i])}
                  />
                ))}
              </div>
            </div>
            <p className="pt-footer-note">Use ← / → arrow keys to navigate</p>
          </>
        )
      )}

      <div className="pt-submit-bar">
        <div>
          {!allAnswered && totalQuestions > 0 && (
            <span className="pt-submit-warn">
              {totalQuestions - answeredCount} unanswered — you can still submit.
            </span>
          )}
          {submitError && <span className="pt-submit-warn">{submitError}</span>}
        </div>
        <button
          className="pt-primary-btn"
          onClick={onSubmit}
          disabled={submitting || totalQuestions === 0}
        >
          {submitting ? "Submitting…" : "Submit answers"}
        </button>
      </div>
    </div>
  )
}

const STYLE_CSS = `
      :root {
        --pt-green: #1a3d2e;
        --pt-green-soft: #2d5544;
        --pt-cream: #f5f0e1;
        --pt-cream-soft: #faf6ec;
        --pt-gold: #c8a951;
        --pt-ink: #1a1a1a;
        --pt-muted: #6b6b6b;
        --pt-line: #d9d2bd;
      }
      body { background: var(--pt-cream); color: var(--pt-ink); font-family: 'DM Sans', system-ui, sans-serif; }
      .pt-shell { padding: 24px 32px 120px; max-width: 1080px; margin: 0 auto; }

      .pt-masthead {
        border-bottom: 2px solid var(--pt-green);
        padding-bottom: 16px;
        margin-bottom: 24px;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
      }
      .pt-masthead h1 {
        font-family: Playfair Display, Georgia, serif;
        font-weight: 700;
        font-size: 1.85rem;
        color: var(--pt-green);
        line-height: 1.1;
        margin: 0;
      }
      .pt-subtitle {
        font-size: 0.8rem; color: var(--pt-muted); margin-top: 4px;
        letter-spacing: 0.04em; text-transform: uppercase;
      }
      .pt-meta { font-family: ui-monospace, JetBrains Mono, monospace; font-size: 0.8rem; color: var(--pt-green); text-align: right; }
      .pt-meta-label { color: var(--pt-muted); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.7rem; }

      .pt-view-toggle {
        display: flex; gap: 0;
        border: 1px solid var(--pt-green);
        border-radius: 4px; overflow: hidden; width: fit-content; margin-bottom: 24px;
      }
      .pt-view-toggle button {
        background: transparent; border: none;
        padding: 8px 16px;
        font-family: inherit; font-size: 0.85rem; font-weight: 500;
        color: var(--pt-green); cursor: pointer; transition: background 0.15s;
      }
      .pt-view-toggle button.pt-active { background: var(--pt-green); color: var(--pt-cream); }
      .pt-view-toggle button:not(.pt-active):hover { background: rgba(26,61,46,0.08); }

      .pt-grid-hint { display: flex; gap: 12px; margin-bottom: 16px; font-size: 0.85rem; color: var(--pt-muted); }
      .pt-qgrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
        gap: 8px;
        max-width: 720px;
      }
      .pt-qgrid button {
        aspect-ratio: 1;
        background: var(--pt-cream-soft);
        border: 1px solid var(--pt-line);
        border-radius: 4px;
        font-family: ui-monospace, JetBrains Mono, monospace;
        font-size: 0.85rem; font-weight: 600; color: var(--pt-green);
        cursor: pointer; transition: all 0.15s;
      }
      .pt-qgrid button:hover { border-color: var(--pt-green); background: var(--pt-cream); transform: translateY(-1px); }
      .pt-qgrid button.pt-set-marker { background: var(--pt-green); color: var(--pt-cream); border-color: var(--pt-green); }
      .pt-qgrid button.pt-grid-answered { box-shadow: inset 0 0 0 2px var(--pt-gold); }
      .pt-set-divider {
        grid-column: 1 / -1;
        font-family: ui-monospace, JetBrains Mono, monospace;
        font-size: 0.75rem; color: var(--pt-muted);
        text-transform: uppercase; letter-spacing: 0.1em;
        padding: 12px 0 4px;
        border-bottom: 1px dashed var(--pt-line); margin-top: 8px;
      }

      .pt-qnav {
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
        margin-bottom: 24px; padding: 12px 16px;
        background: var(--pt-green); color: var(--pt-cream);
        border-radius: 6px;
      }
      .pt-qnav button {
        background: var(--pt-gold); color: var(--pt-green);
        border: none; padding: 8px 18px;
        font-family: inherit; font-weight: 600; font-size: 0.9rem;
        border-radius: 4px; cursor: pointer; transition: transform 0.1s, opacity 0.15s;
      }
      .pt-qnav button:hover:not(:disabled) { transform: translateY(-1px); }
      .pt-qnav button:disabled { opacity: 0.35; cursor: not-allowed; }
      .pt-qcounter { font-family: ui-monospace, JetBrains Mono, monospace; font-size: 0.95rem; font-weight: 600; }
      .pt-qcounter input {
        width: 50px; background: var(--pt-cream); color: var(--pt-green);
        border: 1px solid var(--pt-gold); border-radius: 3px; padding: 2px 4px;
        font: inherit; text-align: center;
      }

      .pt-card {
        background: var(--pt-cream-soft);
        border: 1px solid var(--pt-line);
        border-left: 4px solid var(--pt-gold);
        border-radius: 6px;
        padding: 32px 36px;
      }
      .pt-card.pt-error { border-left-color: #c0392b; text-align: center; }

      .pt-stem-context {
        background: rgba(26,61,46,0.04);
        border-left: 3px solid var(--pt-green-soft);
        padding: 14px 18px;
        margin-bottom: 20px;
        font-size: 0.92rem;
        color: var(--pt-green-soft);
        border-radius: 0 4px 4px 0;
      }
      .pt-stem-label {
        font-family: ui-monospace, JetBrains Mono, monospace;
        font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
        color: var(--pt-muted); display: block; margin-bottom: 6px;
      }
      .pt-q-number {
        font-family: Playfair Display, Georgia, serif;
        font-size: 1.4rem; color: var(--pt-green);
        font-weight: 700; margin-bottom: 12px; letter-spacing: 0.02em;
      }
      .pt-q-number::before {
        content: "Question ";
        font-weight: 600; font-size: 0.85em; color: var(--pt-muted);
        text-transform: uppercase; letter-spacing: 0.1em;
        font-family: inherit;
        vertical-align: 0.2em; margin-right: 6px;
      }
      .pt-q-prompt { font-size: 1.05rem; line-height: 1.55; margin-bottom: 22px; color: var(--pt-ink); }
      .pt-q-figure {
        background: white;
        border: 1px solid var(--pt-line);
        padding: 18px 20px;
        margin: 18px 0;
        font-family: ui-monospace, JetBrains Mono, monospace;
        font-size: 0.95rem; line-height: 1.7; color: var(--pt-green);
        border-radius: 4px; overflow-x: auto; text-align: center;
      }
      .pt-choices { display: grid; gap: 10px; }
      .pt-choice {
        display: grid;
        grid-template-columns: 32px 1fr;
        align-items: start;
        padding: 12px 16px;
        background: white;
        border: 1px solid var(--pt-line);
        border-radius: 4px;
        font-size: 0.98rem; line-height: 1.5;
        transition: all 0.15s; cursor: pointer;
      }
      .pt-choice:hover { border-color: var(--pt-green); background: var(--pt-cream); }
      .pt-choice .pt-letter {
        font-family: Playfair Display, Georgia, serif;
        font-weight: 700; color: var(--pt-gold); font-size: 1.1rem;
      }
      .pt-choice.pt-choice-selected { background: var(--pt-green); color: var(--pt-cream); border-color: var(--pt-green); }
      .pt-choice.pt-choice-selected .pt-letter { color: var(--pt-gold); }
      .pt-choice-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
      .pt-choice-table th, .pt-choice-table td {
        border: 1px solid var(--pt-line); padding: 6px 10px; text-align: left;
      }
      .pt-choice-table th { background: rgba(26,61,46,0.06); font-weight: 600; color: var(--pt-green); }
      .pt-choice.pt-choice-selected .pt-choice-table th { background: rgba(245,240,225,0.15); color: var(--pt-cream); }
      .pt-choice.pt-choice-selected .pt-choice-table th, .pt-choice.pt-choice-selected .pt-choice-table td { border-color: rgba(245,240,225,0.3); }

      .pt-section-title {
        font-family: Playfair Display, Georgia, serif;
        color: var(--pt-green); font-size: 1.2rem; margin: 0 0 12px 0;
      }
      .pt-score {
        font-family: Playfair Display, Georgia, serif;
        color: var(--pt-green); font-size: 3rem; font-weight: 700; line-height: 1;
      }
      .pt-score-sep { color: var(--pt-muted); margin: 0 6px; font-weight: 400; }
      .pt-score-pct { font-size: 1.2rem; color: var(--pt-gold); margin-left: 14px; vertical-align: middle; }
      .pt-bg-light { background: white; border: 1px solid var(--pt-line); border-radius: 6px; padding: 18px 22px; }

      .pt-name-input {
        width: 100%;
        background: white; color: var(--pt-ink);
        border: 1px solid var(--pt-line); border-radius: 4px;
        padding: 10px 14px; font: inherit; font-size: 1rem;
      }
      .pt-name-input:focus { outline: 2px solid var(--pt-gold); outline-offset: 1px; border-color: var(--pt-gold); }

      .pt-primary-btn {
        background: var(--pt-green); color: var(--pt-cream);
        border: 1px solid var(--pt-green);
        padding: 10px 22px;
        font: inherit; font-weight: 600; font-size: 0.95rem;
        border-radius: 4px; cursor: pointer; transition: all 0.15s;
      }
      .pt-primary-btn:hover:not(:disabled) { background: var(--pt-green-soft); }
      .pt-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .pt-submit-bar {
        position: fixed; bottom: 0; left: 0; right: 0;
        padding: 14px 32px;
        background: rgba(245, 240, 225, 0.96);
        backdrop-filter: blur(8px);
        border-top: 1px solid var(--pt-line);
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
        z-index: 10;
      }
      .pt-submit-warn { color: var(--pt-green-soft); font-size: 0.85rem; }

      .pt-footer-note {
        text-align: center; margin-top: 24px;
        font-size: 0.8rem; color: var(--pt-muted);
        font-family: ui-monospace, JetBrains Mono, monospace;
      }

      @media (max-width: 640px) {
        .pt-shell { padding: 16px 16px 120px; }
        .pt-card { padding: 20px; }
        .pt-masthead h1 { font-size: 1.4rem; }
      }
    `

function Style() {
  return <style dangerouslySetInnerHTML={{ __html: STYLE_CSS }} />
}

"use client";

import * as React from "react";
import { Check, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { GUIDE, AUDIENCE_LABELS, type GuideAudience } from "./content";
import { GuideFigure } from "./guide-figures";

const STORAGE_KEY = "psm-guide-progress-v1";
const AUDIENCES: GuideAudience[] = ["user", "admin"];

type Progress = Record<GuideAudience, string[]>;

const EMPTY_PROGRESS: Progress = { user: [], admin: [] };

export function GuideView() {
  const [audience, setAudience] = React.useState<GuideAudience>("user");
  const [chapterIndex, setChapterIndex] = React.useState(0);
  const [completed, setCompleted] = React.useState<Progress>(EMPTY_PROGRESS);

  // Load saved reading progress once, on the client only.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Progress>;
        setCompleted({ user: parsed.user ?? [], admin: parsed.admin ?? [] });
      }
    } catch {
      // Ignore unreadable/old progress — it only affects checkmarks.
    }
  }, []);

  const persist = (next: Progress) => {
    setCompleted(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode); progress just won't persist.
    }
  };

  const chapters = GUIDE[audience];
  const chapter = chapters[chapterIndex];
  const doneIds = completed[audience];
  const isLast = chapterIndex === chapters.length - 1;
  const percent = Math.round((doneIds.length / chapters.length) * 100);

  const switchAudience = (next: GuideAudience) => {
    setAudience(next);
    setChapterIndex(0);
  };

  const markDone = () => {
    if (!doneIds.includes(chapter.id)) {
      persist({ ...completed, [audience]: [...doneIds, chapter.id] });
    }
  };

  const handlePrimary = () => {
    markDone();
    if (!isLast) setChapterIndex((i) => i + 1);
  };

  return (
    <div className="space-y-8">
      {/* Audience tabs */}
      <div className="flex flex-wrap gap-px border border-hp-rule w-fit">
        {AUDIENCES.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => switchAudience(a)}
            className={cn(
              "px-5 py-2.5 uppercase tracking-eyebrow text-[11px] transition-colors",
              audience === a ? "bg-hp-ink text-hp-card" : "text-hp-muted hover:text-hp-ink",
            )}
          >
            {AUDIENCE_LABELS[a]}
          </button>
        ))}
      </div>

      {/* Progress + chapter rail */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Chapter {chapterIndex + 1} of {chapters.length}</span>
          <span className="text-[11px] uppercase tracking-eyebrow text-hp-muted tabular-nums">{percent}%</span>
        </div>
        <div className="h-px w-full bg-hp-rule">
          <div className="h-px bg-hp-pink transition-all" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {chapters.map((ch, i) => {
            const done = doneIds.includes(ch.id);
            const active = i === chapterIndex;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChapterIndex(i)}
                className={cn(
                  "flex items-center gap-1.5 border px-3 py-1.5 text-[11px] transition-colors",
                  active
                    ? "border-hp-ink bg-hp-ink text-hp-card"
                    : "border-hp-rule text-hp-body hover:text-hp-ink hover:border-hp-ink",
                )}
              >
                <span className={cn("inline-flex h-4 w-4 items-center justify-center", active ? "text-hp-card" : "text-hp-pink")}>
                  {done ? <Check className="h-3.5 w-3.5" /> : <span className="tabular-nums">{i + 1}</span>}
                </span>
                <span>{ch.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chapter body */}
      <article className="space-y-7">
        <h1 className="font-title text-[30px] leading-tight text-hp-ink">{chapter.title}</h1>

        <div className="border-l-2 border-hp-pink bg-hp-inset px-5 py-4">
          <span className="eyebrow mb-1.5">What you'll learn</span>
          <p className="text-[15px] leading-relaxed text-hp-body">{chapter.whatYoullLearn}</p>
        </div>

        <div className="space-y-6">
          {chapter.sections.map((section, i) => {
            if (section.kind === "prose") {
              return (
                <section key={i}>
                  <h2 className="font-title text-[19px] text-hp-ink">{section.heading}</h2>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-hp-body">{section.body}</p>
                </section>
              );
            }
            if (section.kind === "figure") {
              return (
                <figure key={i} className="space-y-3">
                  <GuideFigure variant={section.variant} />
                  {section.callouts && section.callouts.length > 0 && (
                    <ul className="space-y-1.5">
                      {section.callouts.map((c) => (
                        <li key={c.n} className="flex items-start gap-2 text-[14px] leading-relaxed text-hp-body">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-hp-pink text-[11px] font-medium tabular-nums text-hp-card">
                            {c.n}
                          </span>
                          <span>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.caption && (
                    <figcaption className="text-xs italic text-hp-muted">{section.caption}</figcaption>
                  )}
                </figure>
              );
            }
            return (
              <dl key={i} className="divide-y divide-hp-rule">
                {section.items.map((item) => (
                  <div key={item.term} className="py-4 first:pt-0">
                    <dt className="font-title text-[17px] text-hp-ink">{item.term}</dt>
                    <dd className="mt-1 text-[15px] leading-relaxed text-hp-body">{item.definition}</dd>
                  </div>
                ))}
              </dl>
            );
          })}
        </div>
      </article>

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-hp-rule pt-5">
        <button
          type="button"
          onClick={() => setChapterIndex((i) => Math.max(0, i - 1))}
          disabled={chapterIndex === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 uppercase tracking-eyebrow text-[11px] text-hp-body hover:text-hp-ink disabled:opacity-40 disabled:hover:text-hp-body"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handlePrimary}
          className="inline-flex items-center gap-1.5 bg-hp-ink px-5 py-2 uppercase tracking-eyebrow text-[11px] text-hp-card transition-opacity hover:opacity-90"
        >
          {isLast ? (
            <>
              Complete
              <Check className="h-4 w-4" />
            </>
          ) : (
            "Next"
          )}
        </button>
      </div>
    </div>
  );
}

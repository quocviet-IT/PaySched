interface Props {
  title: string;
  portFrom: string;
  next: string;
}

export function Placeholder({ title, portFrom, next }: Props) {
  return (
    <div className="space-y-8">
      <header>
        <span className="eyebrow mb-2">Coming soon</span>
        <h1 className="font-title text-[32px] leading-tight text-hp-ink">{title}</h1>
        <div className="mt-5 h-px bg-hp-rule" />
      </header>

      <div className="bg-hp-card border border-hp-rule p-8">
        <span className="eyebrow mb-4">Not yet ported</span>
        <dl className="space-y-4 text-sm text-hp-body">
          <div>
            <dt className="text-[11px] uppercase tracking-eyebrow text-hp-muted mb-1">
              Source
            </dt>
            <dd className="font-body">{portFrom}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-eyebrow text-hp-muted mb-1">
              Next
            </dt>
            <dd className="font-body leading-relaxed">{next}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Card } from "@/components/Card";
import { EmptyState, JulieOfflineState } from "@/components/EmptyState";
import { KnowledgeTypeBadge } from "@/components/KnowledgeTypeBadge";
import { OfficialVsLiveFeed } from "@/components/OfficialVsLiveFeed";
import { Timestamp } from "@/components/Timestamp";
import { julie } from "@/lib/julie-client";
import { safeJulieCall } from "@/lib/safe-julie";
import { buildStateWhyView } from "@/lib/state-why-view";

export const dynamic = "force-dynamic";

export default async function WhyPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const result = await safeJulieCall(() => julie.stateWhy(topic));

  if (!result.ok) {
    return <JulieOfflineState detail={result.message} />;
  }

  const data = result.data;
  const view = buildStateWhyView(data);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/dashboard/game-state" className="inline-flex items-center gap-1 text-xs text-accent-strong hover:underline">
          <ArrowLeft size={12} aria-hidden /> Back to Game State
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-text-primary">
          Why does Julie think {topic.replace(/_/g, " ").toLowerCase()} is what it is?
        </h1>
      </div>

      <Card title="Current Taught Value">
        <div className="text-2xl font-semibold text-text-primary">
          {view.currentTaughtValue ?? "Not taught"}
        </div>
        {data.current_state ? (
          <p className="mt-2 text-sm text-text-secondary">
            Source: Explicitly taught Knowledge ·{" "}
            <Link href={`/dashboard/knowledge/${data.current_state.id}`} className="text-accent-strong hover:underline">
              Knowledge #{data.current_state.id}
            </Link>{" "}
            · taught <Timestamp value={data.current_state.created_at} />
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            No administrator has explicitly taught Julie a value for this topic yet.
          </p>
        )}
      </Card>

      {view.showLiveFeed && (
        <Card
          title={view.differs ? "Live Feed Differs From Taught Value" : "Live Feed Observation"}
          subtitle={
            view.differs
              ? "Informational only -- the live feed never overrides taught Knowledge."
              : "Automated, unverified -- shown for comparison, not because it's the reason Julie knows this."
          }
          className={view.differs ? "border-status-attention/40" : undefined}
        >
          <OfficialVsLiveFeed
            officialValue={view.currentTaughtValue ?? "Not taught"}
            liveFeedValue={view.liveFeedValue!}
          />
        </Card>
      )}

      <Card title="History" subtitle="Every STATE taught for this topic, oldest first">
        {data.history.length === 0 ? (
          <EmptyState title="No history" hint="Nothing has been taught for this topic yet." />
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.history.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <KnowledgeTypeBadge type={item.type} />
                    <span className={`text-sm ${item.active ? "text-text-primary" : "text-text-muted line-through"}`}>
                      {item.content}
                    </span>
                    {item.active && (
                      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-strong">
                        Current
                      </span>
                    )}
                  </div>
                  {item.note && <p className="mt-0.5 text-xs text-text-muted">Reason: {item.note}</p>}
                </div>
                <Timestamp value={item.created_at} className="shrink-0 text-xs text-text-muted" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Related Facts" subtitle="Best-effort keyword match -- not exhaustive">
        {data.related_facts.length === 0 ? (
          <EmptyState title="No related facts found" />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.related_facts.map((item) => (
              <li key={item.id} className="flex items-start gap-1.5 text-sm text-text-secondary">
                <BookOpen size={13} className="mt-0.5 shrink-0 text-text-muted" aria-hidden />
                <span className="min-w-0">{item.content}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { JulieOfflineState } from "@/components/EmptyState";
import { KnowledgeTypeBadge } from "@/components/KnowledgeTypeBadge";
import { Timestamp } from "@/components/Timestamp";
import { getSession } from "@/lib/auth";
import { julie } from "@/lib/julie-client";
import { hasRole } from "@/lib/rbac";
import { safeJulieCall } from "@/lib/safe-julie";
import { visibleKnowledgeActions } from "@/lib/knowledge-actions";
import { CorrectButton } from "../CorrectButton";
import { DeactivateButton } from "./DeactivateButton";
import { ReactivateButton } from "./ReactivateButton";

export const dynamic = "force-dynamic";

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) notFound();

  const session = await getSession();
  const canModerate = session ? hasRole(session.role, "moderator") : false;

  const result = await safeJulieCall(() => julie.getKnowledge(itemId));

  if (!result.ok) {
    if (!result.offline && result.status === 404) notFound();
    return <JulieOfflineState detail={result.message} />;
  }

  const item = result.data;
  const actions = visibleKnowledgeActions(item, canModerate);

  let supersededBy: number | null = null;
  if (item.active === false) {
    const all = await safeJulieCall(() => julie.listKnowledge({}));
    if (all.ok) {
      const found = all.data.find((other) => other.supersedes === item.id);
      supersededBy = found?.id ?? null;
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/dashboard/knowledge" className="text-xs text-accent-strong hover:underline">
        ← Back to Knowledge
      </Link>

      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">#{item.id}</span>
            <KnowledgeTypeBadge type={item.type} />
            {item.topic && (
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs font-medium text-text-muted">
                {item.topic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!item.active && (
              <span className="rounded bg-status-problem/10 px-2 py-0.5 text-xs font-medium text-status-problem">
                Deactivated
              </span>
            )}
            {actions.showCorrect && <CorrectButton itemId={item.id} originalContent={item.content} />}
            {actions.showDeactivate && <DeactivateButton itemId={item.id} />}
            {actions.showReactivate && <ReactivateButton itemId={item.id} />}
          </div>
        </div>

        <p className="mt-4 text-lg text-text-primary">{item.content}</p>

        {item.note && (
          <p className="mt-2 text-sm text-text-secondary">
            <span className="text-text-muted">Reason: </span>
            {item.note}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border-subtle pt-4 text-sm">
          <div>
            <dt className="text-xs text-text-muted">Author</dt>
            <dd className="text-text-primary">Discord user {item.author_id}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Created</dt>
            <dd className="text-text-primary"><Timestamp value={item.created_at} /></dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Updated</dt>
            <dd className="text-text-primary"><Timestamp value={item.updated_at} /></dd>
          </div>
          {item.supersedes != null && (
            <div>
              <dt className="text-xs text-text-muted">Supersedes</dt>
              <dd>
                <Link href={`/dashboard/knowledge/${item.supersedes}`} className="text-accent-strong hover:underline">
                  #{item.supersedes}
                </Link>
              </dd>
            </div>
          )}
          {supersededBy != null && (
            <div>
              <dt className="text-xs text-text-muted">Superseded by</dt>
              <dd>
                <Link href={`/dashboard/knowledge/${supersededBy}`} className="text-accent-strong hover:underline">
                  #{supersededBy}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {item.topic && (
        <Link
          href={`/dashboard/knowledge/why/${item.topic}`}
          className="text-center text-sm text-accent-strong hover:underline"
        >
          Why does Julie believe this? →
        </Link>
      )}
    </div>
  );
}

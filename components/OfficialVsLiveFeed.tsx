/** Two-column Official/Live-Feed comparison, shared by the Game State
 * page's conflict list and the Why page's single-topic conflict card
 * so the two never drift into looking like competing sources styled
 * differently. Official is always the visually primary column (bold,
 * text-primary); Live Feed is always visually secondary (muted,
 * explicitly labeled "unverified") -- the hierarchy is in the
 * typography, not just the words, so it reads correctly even at a
 * glance. */
export function OfficialVsLiveFeed({
  officialValue,
  liveFeedValue,
}: {
  officialValue: string;
  liveFeedValue: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Official</div>
        <div className="mt-0.5 truncate font-medium text-text-primary" title={officialValue}>
          {officialValue}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wide text-status-attention">
          Live Feed (unverified)
        </div>
        <div className="mt-0.5 truncate text-text-secondary" title={liveFeedValue}>
          {liveFeedValue}
        </div>
      </div>
    </div>
  );
}

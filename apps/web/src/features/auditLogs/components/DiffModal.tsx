import { Modal, Badge } from "@ui";
import type { AuditLogEntry } from "@/api/audit";
import { computeDiff, formatValue } from "../diff";
import { styles } from "../styles";
import { formatDate } from "@/lib/format";

export interface DiffModalProps {
  entry: AuditLogEntry | null;
  onClose: () => void;
}

export function DiffModal({ entry, onClose }: DiffModalProps) {
  if (entry === null) return null;

  const before = entry.beforeJson ?? {};
  const after = entry.afterJson ?? {};
  const diff = computeDiff(before, after);

  const actionTone =
    entry.action === "CREATE"
      ? "green"
      : entry.action === "DELETE"
        ? "red"
        : entry.action === "UPDATE"
          ? "amber"
          : "blue";

  if (diff.all.length === 0) {
    return (
      <Modal
        open={entry !== null}
        onClose={onClose}
        title="Audit diff"
        description={`${entry.action} ${entry.resourceType}`}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm text-ink">
            <Badge tone={actionTone}>{entry.action}</Badge>
            <span>{entry.resourceType}</span>
            <span className="text-ink-faint">{formatDate(entry.createdAt)}</span>
          </div>
          <p className="text-sm text-ink-soft">
            No field-level changes recorded for this event.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={entry !== null}
      onClose={onClose}
      title="Field-level diff"
      description={`${entry.action} ${entry.resourceType} · ${entry.resourceName}`}
      size="lg"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink">
          <Badge tone={actionTone}>{entry.action}</Badge>
          <Badge tone="gray">{formatDate(entry.createdAt)}</Badge>
          <span className="text-xs text-ink-soft">actor: {entry.actor}</span>
          <span className="text-xs text-ink-soft">
            changes: {diff.additions.length} added · {diff.removals.length} removed ·{" "}
            {diff.updates.length} updated
          </span>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-lg border border-hairline">
          <table className={styles.table}>
            <thead>
              <tr className={styles.headerRow}>
                <th className={styles.headerCell}>Field</th>
                <th className={styles.headerCell}>Before</th>
                <th className={styles.headerCell}>After</th>
              </tr>
            </thead>
            <tbody>
              {diff.all.map((change) => {
                const isAdded = change.type === "added";
                const isRemoved = change.type === "removed";
                return (
                  <tr key={change.field} className={styles.bodyRow}>
                    <td className={styles.fieldCell}>{change.field}</td>
                    <td className={styles.removedCell}>
                      {isRemoved || change.type === "updated" ? (
                        <span className={styles.valueBlock}>{formatValue(change.before)}</span>
                      ) : (
                        <span className={styles.unchanged}>—</span>
                      )}
                    </td>
                    <td className={styles.addedCell}>
                      {isAdded || change.type === "updated" ? (
                        <span className={styles.valueBlock}>{formatValue(change.after)}</span>
                      ) : (
                        <span className={styles.unchanged}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
/**
 * Maps complaint lifecycle statuses to accurate progress percentages,
 * labels, badges, and terminal/unknown visual treatments.
 * Ensures terminal states (Rejected, Cancelled) and unknown statuses
 * never appear as advancing toward resolution.
 */
export function getStatusDisplayMeta(rawStatus) {
  const raw = String(rawStatus ?? '').trim();
  const normalized = raw.toLowerCase();

  switch (normalized) {
    case 'submitted':
      return {
        kind: 'active',
        label: raw || 'Submitted',
        percentage: 25,
        stageLabel: '25% Complete · Submitted',
        leftLabel: 'Submitted',
        rightLabel: 'Resolved',
        icon: 'fa-clock',
        color: '#f9b84a',
        barClass: '',
        note: '',
        isTerminal: false,
      };
    case 'verified':
      return {
        kind: 'active',
        label: raw || 'Verified',
        percentage: 50,
        stageLabel: '50% Complete · Verified',
        leftLabel: 'Submitted',
        rightLabel: 'Resolved',
        icon: 'fa-check-circle',
        color: '#38bdf8',
        barClass: '',
        note: '',
        isTerminal: false,
      };
    case 'assigned':
      return {
        kind: 'active',
        label: raw || 'Assigned',
        percentage: 60,
        stageLabel: '60% Complete · Assigned',
        leftLabel: 'Submitted',
        rightLabel: 'Resolved',
        icon: 'fa-user-check',
        color: '#38bdf8',
        barClass: '',
        note: '',
        isTerminal: false,
      };
    case 'in progress':
    case 'in-progress':
      return {
        kind: 'active',
        label: raw || 'In Progress',
        percentage: 75,
        stageLabel: '75% Complete · In Progress',
        leftLabel: 'Submitted',
        rightLabel: 'Resolved',
        icon: 'fa-spinner fa-pulse',
        color: '#7DFF6A',
        barClass: '',
        note: '',
        isTerminal: false,
      };
    case 'resolved':
    case 'completed':
      return {
        kind: 'resolved',
        label: raw || 'Resolved',
        percentage: 100,
        stageLabel: '100% Complete · Resolved',
        leftLabel: 'Submitted',
        rightLabel: 'Resolved',
        icon: 'fa-check-circle',
        color: '#4CAF50',
        barClass: '',
        note: '',
        isTerminal: true,
      };
    case 'rejected':
      return {
        kind: 'terminal',
        label: raw || 'Rejected',
        percentage: 100,
        stageLabel: 'Closed · Rejected',
        leftLabel: 'Submitted',
        rightLabel: 'Rejected',
        icon: 'fa-times-circle',
        color: '#ff6b6b',
        barClass: 'terminal-rejected',
        note: 'This complaint was closed as Rejected and is not progressing toward resolution.',
        isTerminal: true,
      };
    case 'cancelled':
    case 'canceled':
      return {
        kind: 'terminal',
        label: raw || 'Cancelled',
        percentage: 100,
        stageLabel: 'Closed · Cancelled',
        leftLabel: 'Submitted',
        rightLabel: 'Cancelled',
        icon: 'fa-ban',
        color: '#f9b84a',
        barClass: 'terminal-cancelled',
        note: 'This complaint was Cancelled and is no longer active.',
        isTerminal: true,
      };
    default: {
      const safeLabel = raw || 'Unknown';
      return {
        kind: 'unknown',
        label: safeLabel,
        percentage: 100,
        stageLabel: `Current Status: ${safeLabel}`,
        leftLabel: 'Submitted',
        rightLabel: safeLabel,
        icon: 'fa-info-circle',
        color: '#94a3b8',
        barClass: 'unknown-stage',
        note: 'Status stage is updated directly by Panchayat officials.',
        isTerminal: false,
      };
    }
  }
}

export function isVoteEligibleStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  return (
    normalized === 'submitted' ||
    normalized === 'verified' ||
    normalized === 'assigned' ||
    normalized === 'in progress' ||
    normalized === 'in-progress'
  );
}


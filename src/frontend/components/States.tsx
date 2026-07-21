// Reusable loading, error, and empty state components for consistent UI.

export function SkeletonCard() {
  return (
    <div className="card" style={{ minHeight: 80 }}>
      <div style={{ background: '#1e293b', height: 14, borderRadius: 4, width: '60%', marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ background: '#1e293b', height: 24, borderRadius: 4, width: '40%', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="list-item" style={{ minHeight: 60 }}>
          <div style={{ background: '#1e293b', height: 14, borderRadius: 4, width: '70%', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ background: '#1e293b', height: 12, borderRadius: 4, width: '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid #1e293b', borderTopColor: '#22d3ee', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 12 }} />
      <span style={{ color: '#94a3b8' }}>{message}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="panel" style={{ textAlign: 'center', padding: 40, borderColor: '#f87171' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Request failed</div>
      <div style={{ color: '#94a3b8', marginBottom: 16 }}>{message}</div>
      {onRetry && (
        <button className="button" onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="panel" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
      {message}
    </div>
  );
}

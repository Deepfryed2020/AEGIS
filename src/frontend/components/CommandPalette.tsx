import { useEffect, useState, useCallback } from 'react';

interface CommandItem {
  id: string;
  label: string;
  type: 'page' | 'investigation' | 'entity' | 'document' | 'command' | 'plugin';
  action: () => void;
  hint?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export default function CommandPalette({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const pages: Array<{ path: string; label: string }> = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/investigations', label: 'Investigations' },
    { path: '/evidence', label: 'Evidence' },
    { path: '/explorer', label: 'Evidence Explorer' },
    { path: '/graph', label: 'Knowledge Graph' },
    { path: '/profiles', label: 'Entity Profiles' },
    { path: '/claims', label: 'Claims' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/assistant', label: 'Investigation Assistant' },
    { path: '/sources', label: 'Sources' },
    { path: '/reliability', label: 'Reliability' },
    { path: '/ingestion', label: 'Ingestion Queue' },
    { path: '/diff', label: 'Difference Engine' },
    { path: '/jobs', label: 'Job Monitor' },
    { path: '/search2', label: 'Search 2.0' },
    { path: '/reports', label: 'Reports' },
    { path: '/report-generator', label: 'Report Generator' },
    { path: '/plugins', label: 'Plugins' },
    { path: '/devconsole', label: 'Developer Console' },
    { path: '/settings', label: 'Settings' },
  ];

  const commands: CommandItem[] = [
    ...pages.map((p) => ({
      id: `page-${p.path}`,
      label: p.label,
      type: 'page' as const,
      action: () => onNavigate(p.path),
      hint: p.path,
    })),
  ];

  useEffect(() => {
    if (!query.trim()) {
      setResults(commands);
      setSelectedIndex(0);
      return;
    }
    const lower = query.toLowerCase();
    const filtered = commands.filter((c) => c.label.toLowerCase().includes(lower) || c.hint?.toLowerCase().includes(lower));
    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, onClose]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(commands);
      setSelectedIndex(0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 600,
          background: '#0f172a',
          border: '1px solid #22d3ee',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search pages, investigations, entities, commands…"
          style={{
            width: '100%',
            padding: '16px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #1e293b',
            color: '#f1f5f9',
            fontSize: 16,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ padding: 20, color: '#94a3b8' }}>No results found</div>
          ) : (
            results.map((item, i) => (
              <div
                key={item.id}
                onClick={() => { item.action(); onClose(); }}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  background: i === selectedIndex ? '#1e293b' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #1e293b',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div style={{ color: '#f1f5f9' }}>{item.label}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{item.type} {item.hint}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

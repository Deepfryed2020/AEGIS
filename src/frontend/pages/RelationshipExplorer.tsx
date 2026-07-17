import { useEffect, useMemo, useRef, useState } from 'react';

interface GraphNode {
  id: string;
  name: string;
  type: string;
  mentionCount: number;
}

interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
  evidenceId?: string;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const TYPE_COLORS: Record<string, string> = {
  Person: '#60a5fa',
  Department: '#34d399',
  Agency: '#22d3ee',
  Minister: '#f472b6',
  Company: '#fbbf24',
  Legislation: '#a78bfa',
  Committee: '#fb923c',
  Date: '#94a3b8',
  Other: '#cbd5e1',
};

const RELATIONSHIP_FILTERS = [
  'MENTIONED_WITH',
  'RELATED_TO',
  'FUNDED_BY',
  'AWARDED',
  'AMENDED',
  'SUPPORTED',
  'OPPOSED',
  'INVESTIGATED',
  'PART_OF',
];

export default function RelationshipExplorer() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeRels, setActiveRels] = useState<Set<string>>(new Set(RELATIONSHIP_FILTERS));
  const [minMentions, setMinMentions] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch('/api/graph?nodes=200&edges=600')
      .then((res) => res.json())
      .then((data) => {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      });
  }, []);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (n.mentionCount < minMentions) return false;
      if (query && !n.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [nodes, minMentions, query]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => {
      if (!activeRels.has(e.type)) return false;
      if (!filteredNodeIds.has(e.sourceId) || !filteredNodeIds.has(e.targetId)) return false;
      return true;
    });
  }, [edges, activeRels, filteredNodeIds]);

  const simNodes = useRef<SimNode[]>([]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const cx = 400;
    const cy = 300;
    simNodes.current = filteredNodes.map((n, i) => {
      const angle = (i / filteredNodes.length) * Math.PI * 2;
      const radius = 180 + (i % 5) * 20;
      return {
        ...n,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });
    forceRender((v) => v + 1);
  }, [filteredNodes]);

  useEffect(() => {
    if (!simNodes.current.length) return;
    let raf = 0;
    const nodeMap = new Map(simNodes.current.map((n) => [n.id, n]));

    const tick = () => {
      const sn = simNodes.current;
      const cx = 400;
      const cy = 300;
      sn.forEach((n) => {
        n.vx *= 0.85;
        n.vy *= 0.85;
        const dx = n.x - cx;
        const dy = n.y - cy;
        n.vx -= dx * 0.0008;
        n.vy -= dy * 0.0008;
      });
      for (let i = 0; i < sn.length; i += 1) {
        for (let j = i + 1; j < sn.length; j += 1) {
          const a = sn[i];
          const b = sn[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 60;
          if (dist < minDist) {
            const push = (minDist - dist) / dist * 0.5;
            a.vx -= dx * push;
            a.vy -= dy * push;
            b.vx += dx * push;
            b.vy += dy * push;
          }
        }
      }
      filteredEdges.forEach((e) => {
        const a = nodeMap.get(e.sourceId);
        const b = nodeMap.get(e.targetId);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 120;
        const force = (dist - target) / dist * 0.02;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      });
      sn.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(30, Math.min(770, n.x));
        n.y = Math.max(30, Math.min(570, n.y));
      });
      forceRender((v) => v + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [filteredEdges]);

  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) : null;
  const selectedEdges = selectedId
    ? edges.filter((e) => e.sourceId === selectedId || e.targetId === selectedId)
    : [];

  function toggleRel(type: string) {
    setActiveRels((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Relationship Explorer</h1>
          <p>Interactive knowledge graph of people, agencies, legislation, and companies extracted from ingested evidence.</p>
        </div>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entities"
              style={{ minWidth: 220 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
              Min mentions
              <input
                type="number"
                min={1}
                value={minMentions}
                onChange={(e) => setMinMentions(Number(e.target.value))}
                style={{ width: 70 }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {RELATIONSHIP_FILTERS.map((type) => (
              <button
                key={type}
                onClick={() => toggleRel(type)}
                className="button"
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  background: activeRels.has(type) ? '#4f46e5' : '#1e293b',
                  opacity: activeRels.has(type) ? 1 : 0.6,
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <svg ref={svgRef} viewBox="0 0 800 600" style={{ width: '100%', height: 560, background: '#060710', borderRadius: 12 }}>
            {filteredEdges.map((e) => {
              const a = simNodes.current.find((n) => n.id === e.sourceId);
              const b = simNodes.current.find((n) => n.id === e.targetId);
              if (!a || !b) return null;
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#27334f"
                  strokeWidth={Math.min(3, 0.5 + e.weight)}
                  opacity={0.6}
                />
              );
            })}
            {simNodes.current.map((n) => {
              const radius = Math.min(18, 6 + n.mentionCount);
              const color = TYPE_COLORS[n.type] || '#cbd5e1';
              const isSelected = n.id === selectedId;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  onClick={() => setSelectedId(n.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={radius}
                    fill={color}
                    stroke={isSelected ? '#ffffff' : 'transparent'}
                    strokeWidth={isSelected ? 3 : 0}
                    opacity={0.9}
                  />
                  <text
                    x={radius + 4}
                    y={4}
                    fill="#e5e7eb"
                    fontSize={11}
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.name.length > 28 ? n.name.slice(0, 28) + '…' : n.name}
                  </text>
                </g>
              );
            })}
          </svg>
          <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>
            {filteredNodes.length} entities • {filteredEdges.length} relationships
          </div>
        </div>
        <div className="panel" style={{ minHeight: 560 }}>
          {selectedNode ? (
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedNode.name}</div>
              <div style={{ color: '#94a3b8', marginBottom: 12 }}>
                Type: {selectedNode.type} • Mentions: {selectedNode.mentionCount}
              </div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Connected relationships</div>
              {selectedEdges.length === 0 ? (
                <div style={{ color: '#94a3b8' }}>No direct relationships found.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {selectedEdges.map((e) => {
                    const otherId = e.sourceId === selectedId ? e.targetId : e.sourceId;
                    const other = nodes.find((n) => n.id === otherId);
                    const direction = e.sourceId === selectedId ? '→' : '←';
                    return (
                      <div key={e.id} className="list-item" style={{ padding: 10, gap: 4 }}>
                        <div style={{ fontWeight: 600 }}>{e.type} {direction} {other?.name || otherId}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>Weight: {e.weight.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>Select a node in the graph to inspect its relationships.</div>
          )}
        </div>
      </div>
    </div>
  );
}

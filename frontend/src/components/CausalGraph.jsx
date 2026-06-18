import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GitCommit, RefreshCw, X } from 'lucide-react';
import SeverityBadge from './SeverityBadge';

const SEVERITY_COLORS = {
  critical: '#dc2626',
  error:    '#f97316',
  warning:  '#f59e0b',
  info:     '#3b82f6',
  debug:    '#6b7280',
};


function nodeRadius(blastRadius) {
  return Math.max(8, Math.min(28, 8 + (blastRadius || 0) * 1.2));
}

const NodeDetailPanel = ({ node, onClose }) => (
  <div className="absolute bottom-4 right-4 w-72 card border-accent-primary/30 shadow-glow-indigo z-10">
    <div className="flex items-start justify-between mb-3">
      <SeverityBadge severity={node.severity} />
      <button onClick={onClose} className="text-text-muted hover:text-text-primary p-0.5">
        <X size={14} />
      </button>
    </div>
    <p className="text-sm font-mono text-text-primary leading-relaxed mb-3 break-words">
      {node.label}
    </p>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="bg-bg-base rounded p-2">
        <p className="text-text-muted mb-0.5">Source</p>
        <p className="text-accent-secondary font-mono font-semibold">{node.source}</p>
      </div>
      <div className="bg-bg-base rounded p-2">
        <p className="text-text-muted mb-0.5">Blast Radius</p>
        <p className="text-accent-primary font-mono font-semibold">{(node.blastRadius || 0).toFixed(2)}</p>
      </div>
      <div className="bg-bg-base rounded p-2">
        <p className="text-text-muted mb-0.5">Chain Depth</p>
        <p className="text-text-primary font-mono font-semibold">{node.depth}</p>
      </div>
      <div className="bg-bg-base rounded p-2">
        <p className="text-text-muted mb-0.5">Role</p>
        <p className={`font-mono font-semibold ${node.isRoot ? 'text-red-400' : 'text-text-secondary'}`}>
          {node.isRoot ? 'Root Cause' : 'Effect'}
        </p>
      </div>
    </div>
  </div>
);

const CausalGraph = ({ nodes = [], edges = [], onRefresh }) => {
  const svgRef   = useRef(null);
  const gRef     = useRef(null);
  const simRef   = useRef(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const container = svgRef.current.parentElement;
    const W = container.clientWidth  || 800;
    const H = container.clientHeight || 520;

    const svg = d3.select(svgRef.current).attr('width', W).attr('height', H);
    svg.selectAll('*').remove();

    if (!nodes.length) return;

    // ── Defs: arrowhead marker + filter for glow ─────────────────
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10').attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#374151');

    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // ── Zoom container ───────────────────────────────────────────
    const g = svg.append('g');
    gRef.current = g;
    svg.call(
      d3.zoom().scaleExtent([0.15, 4]).on('zoom', e => g.attr('transform', e.transform))
    );

    // ── Deep-copy nodes/edges (D3 mutates them) ──────────────────
    const simNodes = nodes.map(n => ({ ...n }));
    const idMap    = new Map(simNodes.map(n => [n.id, n]));
    const simEdges = edges
      .filter(e => idMap.has(e.from) && idMap.has(e.to))
      .map(e => ({ source: e.from, target: e.to }));

    // ── Force simulation ─────────────────────────────────────────
    const sim = d3.forceSimulation(simNodes)
      .force('link',      d3.forceLink(simEdges).id(d => d.id).distance(100).strength(0.8))
      .force('charge',    d3.forceManyBody().strength(-450))
      .force('center',    d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => nodeRadius(d.blastRadius) + 12));
    simRef.current = sim;

    // ── Links ────────────────────────────────────────────────────
    const link = g.append('g').selectAll('line')
      .data(simEdges).join('line')
      .attr('stroke', '#374151').attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)');

    // ── Nodes ────────────────────────────────────────────────────
    const node = g.append('g').selectAll('circle')
      .data(simNodes).join('circle')
      .attr('r', d => nodeRadius(d.blastRadius))
      .attr('fill', d => SEVERITY_COLORS[d.severity] || '#6b7280')
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => d.isRoot ? '#fff' : SEVERITY_COLORS[d.severity])
      .attr('stroke-width', d => d.isRoot ? 2.5 : 1)
      .style('cursor', 'pointer')
      .style('filter', d => (d.severity === 'critical' || d.severity === 'error') ? 'url(#glow)' : null)
      .on('click', (event, d) => { event.stopPropagation(); setSelected(d); })
      .call(
        d3.drag()
          .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end',   (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // ── Labels ───────────────────────────────────────────────────
    const label = g.append('g').selectAll('text')
      .data(simNodes).join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius(d.blastRadius) + 14)
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .attr('font-family', '"JetBrains Mono", monospace')
      .attr('pointer-events', 'none')
      .text(d => d.source?.slice(0, 16));

    // ── Tick ─────────────────────────────────────────────────────
    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
      label.attr('x', d => d.x).attr('y', d => d.y);
    });

    // Dismiss detail panel on background click
    svg.on('click', () => setSelected(null));

    return () => sim.stop();
  }, [nodes, edges]);

  const isEmpty = !nodes.length;

  return (
    <div className="relative w-full h-full bg-bg-surface rounded-xl border border-border-dim overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border-dim">
          <GitCommit size={13} className="text-accent-primary" />
          <span className="text-xs text-text-secondary font-semibold">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="p-1.5 rounded-lg bg-bg-elevated border border-border-dim text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-bg-elevated border border-border-dim">
        {['critical','error','warning','info'].map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SEVERITY_COLORS[s] }} />
            <span className="text-xs text-text-muted font-mono capitalize">{s}</span>
          </div>
        ))}
        <div className="border-t border-border-dim my-0.5" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">Size = blast radius</span>
        </div>
      </div>

      {isEmpty ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted">
          <GitCommit size={48} className="mb-3 opacity-20" />
          <p className="text-sm font-semibold">No causal relationships detected yet</p>
          <p className="text-xs mt-1 opacity-60">Start the log generator to see the causal graph build in real-time</p>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-full" />
      )}

      {selected && <NodeDetailPanel node={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default CausalGraph;

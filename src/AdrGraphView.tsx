import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type ApiNode = { id: string; type: string; label: string; status: string; sourceFile: string };
type ApiEdge = { id: string; source: string; target: string; kind: string; label?: string };

export function AdrGraphView({ repo }: { repo: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const load = useCallback(async () => {
    if (!repo.trim()) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const r = await fetch(`/api/graph/adrs?repo=${encodeURIComponent(repo)}`);
    const j = (await r.json()) as { nodes: ApiNode[]; edges: ApiEdge[] };
    if (!j.nodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const n = j.nodes.map((node, i) => ({
      id: node.id,
      position: { x: (i % 3) * 260, y: Math.floor(i / 3) * 120 },
      data: { label: `${node.label}\n${node.status}` },
      style: { fontSize: 11, width: 220 },
    }));
    const e = j.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? edge.kind,
      markerEnd: { type: MarkerType.ArrowClosed },
    }));
    setNodes(n);
    setEdges(e);
  }, [repo, setEdges, setNodes]);

  useEffect(() => {
    void load();
  }, [load]);

  const boxStyle = useMemo(() => ({ height: 420, border: "1px solid #e2e8f0", borderRadius: 8 }), []);

  if (!repo.trim()) {
    return <p className="muted">Imposta il repository per vedere il grafo ADR.</p>;
  }

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Archi da riferimenti <code>ADR-NNNN</code> nel testo. Legenda: arco = «menziona» (ADR-0005).
      </p>
      <button type="button" className="secondary" onClick={() => void load()} style={{ marginBottom: "0.5rem" }}>
        Ricarica grafo
      </button>
      {nodes.length === 0 ? (
        <div
          style={{
            ...boxStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <p className="muted" style={{ textAlign: "center", margin: 0 }}>
            Nessun ADR numerato in <code>docs/adr/</code> oppure path non valido.
          </p>
        </div>
      ) : (
        <div style={boxStyle}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}

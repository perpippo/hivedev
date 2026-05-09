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

type MNode = { id: string; label: string };
type MEdge = { id: string; source: string; target: string; kind: string };

export function ModuleGraphView({ repo }: { repo: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const load = useCallback(async () => {
    if (!repo.trim()) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const r = await fetch(`/api/graph/modules?repo=${encodeURIComponent(repo)}`);
    const j = (await r.json()) as { nodes: MNode[]; edges: MEdge[] };
    if (!j.nodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const n = j.nodes.map((node, i) => ({
      id: node.id,
      position: { x: (i % 3) * 200, y: Math.floor(i / 3) * 110 },
      data: { label: node.label },
      style: { fontSize: 12, width: 160 },
    }));
    const e = j.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: "depends_on",
      markerEnd: { type: MarkerType.ArrowClosed },
    }));
    setNodes(n);
    setEdges(e);
  }, [repo, setEdges, setNodes]);

  useEffect(() => {
    void load();
  }, [load]);

  const boxStyle = useMemo(() => ({ height: 360, border: "1px solid #e2e8f0", borderRadius: 8 }), []);

  if (!repo.trim()) {
    return <p className="muted">Imposta il repository per il manifest architettura.</p>;
  }

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Fonte: <code>hivedev.architecture.json</code> nel repo (ADR-0005). Archi = <code>depends_on</code>.
      </p>
      <button type="button" className="secondary" onClick={() => void load()} style={{ marginBottom: "0.5rem" }}>
        Ricarica manifest
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
            Nessun manifest — crea <code>hivedev.architecture.json</code> con array <code>modules</code> (
            <code>id</code>, <code>label</code>, <code>dependsOn</code>).
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

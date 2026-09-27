"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { BasinNode } from "./basin-node";
import { useRouter } from "next/navigation";
import { Info, X, ExternalLink, GitFork } from "lucide-react";
import { formatScore, truncateId } from "@/lib/format";
import { KEY_METRICS } from "@/lib/constants";
import Link from "next/link";

interface RawNode {
  [key: string]: unknown;
  id: string;
  label: string;
  tier: string;
  tier_final: string;
  typology: string;
  is_escalated: boolean;
  is_outlet: boolean;
  score: number;
  rank: number;
}

interface RawEdge {
  id: string;
  source: string;
  target: string;
}

const nodeTypes = {
  basinNode: BasinNode,
};

function getLayoutedElements(nodes: RawNode[], edges: RawEdge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: "LR",
    nodesep: 40,
    ranksep: 90,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 160, height: 75 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      id: node.id,
      type: "basinNode",
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - 80 : 0,
        y: nodeWithPosition ? nodeWithPosition.y - 37 : 0,
      },
      data: node,
    };
  });

  const layoutedEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: false,
    style: { stroke: "#8A94A6", strokeWidth: 1.5 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 14,
      height: 14,
      color: "#8A94A6",
    },
  }));

  return { layoutedNodes, layoutedEdges };
}

export function BasinDagViewer({
  rawNodes,
  rawEdges,
  runId,
}: {
  rawNodes: RawNode[];
  rawEdges: RawEdge[];
  runId: number;
}) {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<RawNode | null>(null);

  const { layoutedNodes, layoutedEdges } = useMemo(
    () => getLayoutedElements(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onNodeClick = (_: any, node: any) => {
    setSelectedNode(node.data);
  };

  return (
    <div className="relative w-full h-[620px] bg-slate-50/60 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* ReactFlow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background color="#CBD5E1" gap={18} size={1} />
        <Controls className="bg-white border border-slate-200 shadow-sm rounded-lg" />
        <MiniMap
          nodeColor={(node: any) => {
            const t = node.data?.tier_final || node.data?.tier;
            if (t === "SIAGA") return "#C8453B";
            if (t === "WASPADA") return "#E8A33D";
            return "#8A94A6";
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-sm"
        />
      </ReactFlow>

      {/* Legend overlay */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2 z-10 pointer-events-auto">
        <div className="font-bold text-navy flex items-center gap-1.5">
          <GitFork className="w-3.5 h-3.5 text-blue" />
          <span>Arah Aliran Sungai (Kiri → Kanan)</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red" />
            <span className="font-medium text-slate-700">SIAGA (10%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-medium text-slate-700">WASPADA (20%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="font-medium text-slate-700">NORMAL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-dashed border-amber-600" />
            <span className="font-medium text-slate-700">Eskalasi Tetangga</span>
          </div>
        </div>
      </div>

      {/* Selected Node Sidebar Drawer */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-72 bg-white/98 backdrop-blur-md p-4 rounded-xl border border-slate-200 shadow-xl z-20 space-y-3 animate-in fade-in slide-in-from-right-4 duration-150">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Sub-DAS Terpilih
              </div>
              <div className="font-mono font-bold text-sm text-navy">
                {selectedNode.id}
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Status Risiko</span>
              <span className="font-bold text-navy">
                {selectedNode.tier_final || selectedNode.tier}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Skor / Rank</span>
              <span className="font-mono font-bold text-navy">
                {formatScore(selectedNode.score)} (#{selectedNode.rank})
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600">
            <span className="text-[10px] text-slate-400 block">Tipologi Hidrologi</span>
            <span className="font-semibold text-navy">
              {
                KEY_METRICS.TYPOLOGY_CHARACTERISTICS[
                  selectedNode.typology as keyof typeof KEY_METRICS.TYPOLOGY_CHARACTERISTICS
                ]?.name
              }
            </span>
          </div>

          <Link
            href={`/sub-das/${selectedNode.id}?run=${runId}`}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-blue text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition shadow-xs"
          >
            <span>Buka Halaman Lengkap Sub-DAS</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

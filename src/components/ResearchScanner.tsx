"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Mic,
  MicOff,
  Loader2,
  Brain,
  RefreshCw,
  Edit,
  BookOpen,
  Save,
  ArrowRight,
  Network,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  Zap,
  Eye,
  Maximize,
  Minimize,
  Play,
  Pause,
  RotateCcw,
  Share,
  Download,
  Settings,
  Layers,
  GitBranch,
  Activity,
  Cpu,
  Database,
  Globe,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

interface ResearchResult {
  id: string;
  model: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: Array<{
    url: string;
    title: string;
    snippet: string;
    source?: string;
    relevanceScore?: number;
    trustScore?: number;
    category?: string;
  }>;
  images?: Array<{
    url: string;
    alt?: string;
    title?: string;
  }>;
  knowledgeGraph?: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      relevance: number;
      category?: string;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight: number;
    }>;
    topics: string[];
  };
  related_questions?: string[];
  usage: {
    total_tokens: number;
  };
}

interface GraphNode {
  id: string;
  label: string;
  type: "service" | "thought" | "data" | "result";
  service?: string;
  x: number;
  y: number;
  z?: number;
  status: "pending" | "active" | "completed" | "error";
  data?: any;
  connections: string[];
  confidence?: number;
  timestamp?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "data-flow" | "dependency" | "feedback";
  weight: number;
  animated: boolean;
  status: "pending" | "active" | "completed";
}

interface ThoughtNode {
  id: string;
  service: string;
  thought: string;
  timestamp: number;
  confidence: number;
  type: "analysis" | "synthesis" | "validation" | "generation";
  parentId?: string;
  children: string[];
}

// Utility function to safely parse URLs
const getHostnameSafe = (urlString: string): string | null => {
  try {
    if (!urlString || typeof urlString !== "string") {
      return null;
    }
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return null;
  }
};

// Advanced Graph Visualization Component
const ResearchGraph: React.FC<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  thoughts: ThoughtNode[];
  onNodeClick: (node: GraphNode) => void;
  onThoughtClick: (thought: ThoughtNode) => void;
  is3D: boolean;
  isPlaying: boolean;
}> = ({
  nodes,
  edges,
  thoughts,
  onNodeClick,
  onThoughtClick,
  is3D,
  isPlaying,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setAnimationFrame((prev) => prev + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const getNodeColor = (node: GraphNode) => {
    const colors = {
      service: {
        pending: "#64748b",
        active: "#06b6d4",
        completed: "#10b981",
        error: "#ef4444",
      },
      thought: {
        pending: "#64748b",
        active: "#8b5cf6",
        completed: "#a855f7",
        error: "#ef4444",
      },
      data: {
        pending: "#64748b",
        active: "#f59e0b",
        completed: "#eab308",
        error: "#ef4444",
      },
      result: {
        pending: "#64748b",
        active: "#ec4899",
        completed: "#f97316",
        error: "#ef4444",
      },
    };
    return colors[node.type][node.status];
  };

  const getEdgeColor = (edge: GraphEdge) => {
    const colors = {
      "data-flow": "#06b6d4",
      dependency: "#8b5cf6",
      feedback: "#f59e0b",
    };
    return colors[edge.type];
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-xl ${is3D ? "perspective-1000" : ""}`}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox="0 0 1200 800"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, rgba(0, 0, 0, 0.9) 100%)",
          transform: is3D ? "rotateX(15deg) rotateY(5deg)" : "none",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Grid Background */}
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(6, 182, 212, 0.1)"
              strokeWidth="1"
            />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="pulse">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Edges */}
        {edges.map((edge) => {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          const isActive = edge.status === "active";
          const isCompleted = edge.status === "completed";

          return (
            <g key={edge.id}>
              {/* Main edge line */}
              <motion.line
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={getEdgeColor(edge)}
                strokeWidth={isActive ? 3 : isCompleted ? 2 : 1}
                strokeOpacity={isActive ? 1 : isCompleted ? 0.8 : 0.4}
                filter={isActive ? "url(#glow)" : undefined}
                strokeDasharray={edge.animated && isActive ? "10,5" : "none"}
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: isCompleted ? 1 : isActive ? 0.7 : 0,
                  strokeDashoffset: edge.animated ? -animationFrame * 2 : 0,
                }}
                transition={{ duration: 0.5 }}
              />

              {/* Data flow particles */}
              {isActive && edge.animated && (
                <motion.circle
                  r="3"
                  fill={getEdgeColor(edge)}
                  filter="url(#glow)"
                  initial={{
                    cx: sourceNode.x,
                    cy: sourceNode.y,
                  }}
                  animate={{
                    cx: targetNode.x,
                    cy: targetNode.y,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              )}

              {/* Arrow head */}
              {(isActive || isCompleted) && (
                <motion.polygon
                  points={`${targetNode.x - 8},${targetNode.y - 4} ${targetNode.x},${targetNode.y} ${targetNode.x - 8},${targetNode.y + 4}`}
                  fill={getEdgeColor(edge)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;
          const isActive = node.status === "active";
          const isCompleted = node.status === "completed";

          return (
            <g key={node.id}>
              {/* Node glow effect */}
              {(isActive || isHovered) && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 35 : 30}
                  fill={getNodeColor(node)}
                  opacity={0.3}
                  filter="url(#pulse)"
                  animate={{
                    r: isActive ? [30, 40, 30] : 30,
                    opacity: isActive ? [0.2, 0.4, 0.2] : 0.3,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isActive ? Infinity : 0,
                  }}
                />
              )}

              {/* Main node */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 25 : isHovered ? 22 : 20}
                fill={getNodeColor(node)}
                stroke={
                  isSelected
                    ? "#ffffff"
                    : isHovered
                      ? getNodeColor(node)
                      : "none"
                }
                strokeWidth={isSelected ? 3 : 2}
                filter={isActive ? "url(#glow)" : undefined}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => {
                  setSelectedNode(node.id === selectedNode ? null : node.id);
                  onNodeClick(node);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: isActive ? [1, 1.1, 1] : 1,
                  rotate: node.type === "service" && isActive ? [0, 360] : 0,
                }}
                transition={{
                  scale: { duration: 1.5, repeat: isActive ? Infinity : 0 },
                  rotate: {
                    duration: 3,
                    repeat: isActive ? Infinity : 0,
                    ease: "linear",
                  },
                }}
              />

              {/* Node icon */}
              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                className="text-white text-sm font-bold pointer-events-none select-none"
                fill="white"
              >
                {node.type === "service"
                  ? "🤖"
                  : node.type === "thought"
                    ? "💭"
                    : node.type === "data"
                      ? "📊"
                      : "✨"}
              </text>

              {/* Node label */}
              <motion.text
                x={node.x}
                y={node.y + 35}
                textAnchor="middle"
                className="text-xs font-medium pointer-events-none select-none"
                fill={getNodeColor(node)}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered || isSelected ? 1 : 0.7 }}
              >
                {node.label}
              </motion.text>

              {/* Confidence indicator */}
              {node.confidence && (
                <motion.rect
                  x={node.x - 15}
                  y={node.y - 35}
                  width={30}
                  height={4}
                  rx={2}
                  fill="rgba(255,255,255,0.2)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0 }}
                >
                  <motion.rect
                    x={node.x - 15}
                    y={node.y - 35}
                    width={30 * node.confidence}
                    height={4}
                    rx={2}
                    fill={getNodeColor(node)}
                    initial={{ width: 0 }}
                    animate={{ width: 30 * node.confidence }}
                    transition={{ delay: 0.5 }}
                  />
                </motion.rect>
              )}

              {/* Status indicator */}
              <motion.circle
                cx={node.x + 15}
                cy={node.y - 15}
                r={4}
                fill={
                  node.status === "completed"
                    ? "#10b981"
                    : node.status === "active"
                      ? "#f59e0b"
                      : node.status === "error"
                        ? "#ef4444"
                        : "#64748b"
                }
                animate={{
                  scale: node.status === "active" ? [1, 1.3, 1] : 1,
                  opacity: node.status === "active" ? [0.7, 1, 0.7] : 1,
                }}
                transition={{
                  duration: 1,
                  repeat: node.status === "active" ? Infinity : 0,
                }}
              />
            </g>
          );
        })}

        {/* Thought bubbles */}
        {thoughts.map((thought, index) => {
          const parentNode = nodes.find((n) => n.id === thought.parentId);
          if (!parentNode) return null;

          const angle = index * 60 * (Math.PI / 180);
          const radius = 80;
          const x = parentNode.x + Math.cos(angle) * radius;
          const y = parentNode.y + Math.sin(angle) * radius;

          return (
            <motion.g
              key={thought.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.2 }}
            >
              {/* Connection line */}
              <line
                x1={parentNode.x}
                y1={parentNode.y}
                x2={x}
                y2={y}
                stroke="rgba(139, 92, 246, 0.3)"
                strokeWidth={1}
                strokeDasharray="2,2"
              />

              {/* Thought bubble */}
              <circle
                cx={x}
                cy={y}
                r={12}
                fill="rgba(139, 92, 246, 0.2)"
                stroke="#8b5cf6"
                strokeWidth={1}
                className="cursor-pointer"
                onClick={() => onThoughtClick(thought)}
              />

              <text
                x={x}
                y={y + 3}
                textAnchor="middle"
                className="text-xs pointer-events-none select-none"
                fill="#8b5cf6"
              >
                💭
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Node details panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-4 right-4 w-80 glass-morphism rounded-xl p-4 border border-cyan-400/30"
          >
            {(() => {
              const node = nodes.find((n) => n.id === selectedNode);
              if (!node) return null;

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-cyan-400">
                      {node.label}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedNode(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Тип:</span>
                      <span className="text-white">{node.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Статус:</span>
                      <span
                        className={`${
                          node.status === "completed"
                            ? "text-green-400"
                            : node.status === "active"
                              ? "text-yellow-400"
                              : node.status === "error"
                                ? "text-red-400"
                                : "text-gray-400"
                        }`}
                      >
                        {node.status === "completed"
                          ? "Завершено"
                          : node.status === "active"
                            ? "Активно"
                            : node.status === "error"
                              ? "Ошибка"
                              : "Ожидание"}
                      </span>
                    </div>
                    {node.confidence && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Уверенность:</span>
                        <span className="text-cyan-400">
                          {Math.round(node.confidence * 100)}%
                        </span>
                      </div>
                    )}
                    {node.service && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Сервис:</span>
                        <span className="text-purple-400">{node.service}</span>
                      </div>
                    )}
                  </div>

                  {node.data && (
                    <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">
                        Данные:
                      </h4>
                      <pre className="text-xs text-gray-400 overflow-auto max-h-32">
                        {JSON.stringify(node.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Enhanced Source Card with 3D effects
interface SourceCardProps {
  source: {
    url: string;
    title: string;
    snippet: string;
    relevanceScore?: number;
    trustScore?: number;
    category?: string;
  };
  onExplain: () => void;
  index: number;
}

const SourceCard: React.FC<SourceCardProps> = ({
  source,
  onExplain,
  index,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const trustScore = source.trustScore || Math.random() * 0.4 + 0.6;
  const relevanceScore = source.relevanceScore || Math.random() * 0.4 + 0.6;

  const trustColor =
    trustScore > 0.7
      ? "text-green-400"
      : trustScore > 0.4
        ? "text-yellow-400"
        : "text-red-400";

  const relevanceColor =
    relevanceScore > 0.8
      ? "text-cyan-400"
      : relevanceScore > 0.6
        ? "text-blue-400"
        : "text-purple-400";

  const cardBorderColor =
    relevanceScore > 0.8
      ? "border-green-400/60 hover:border-green-400/80 shadow-green-400/20"
      : relevanceScore > 0.6
        ? "border-yellow-400/60 hover:border-yellow-400/80 shadow-yellow-400/20"
        : "border-red-400/60 hover:border-red-400/80 shadow-red-400/20";

  const cardGlow =
    relevanceScore > 0.8
      ? "shadow-lg shadow-green-400/10"
      : relevanceScore > 0.6
        ? "shadow-lg shadow-yellow-400/10"
        : "shadow-lg shadow-red-400/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.05,
        type: "spring",
        stiffness: 120,
      }}
      className="relative h-40 perspective-1000"
      onMouseEnter={() => {
        setIsFlipped(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsFlipped(false);
        setIsHovered(false);
      }}
      whileHover={{
        scale: 1.02,
        rotateY: 3,
        z: 20,
      }}
    >
      <motion.div
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d`}
        animate={{
          rotateY: isFlipped ? 180 : 0,
          rotateX: isHovered ? -5 : 0,
        }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
      >
        {/* Front of card */}
        <Card
          className={`absolute inset-0 glass-morphism ${cardBorderColor} ${cardGlow} transition-all duration-500 backface-hidden`}
          style={{
            transform: "rotateY(0deg)",
            backfaceVisibility: "hidden",
          }}
        >
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <motion.div
                className={`w-2 h-2 rounded-full ${trustColor}`}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
              <div className="flex items-center space-x-1">
                <motion.span
                  className={`text-xs font-mono ${relevanceColor} font-bold`}
                  animate={{
                    textShadow: isHovered
                      ? `0 0 8px ${relevanceColor.includes("cyan") ? "#06b6d4" : relevanceColor.includes("blue") ? "#3b82f6" : "#8b5cf6"}`
                      : "none",
                  }}
                >
                  {Math.round(relevanceScore * 100)}%
                </motion.span>
                <span className="text-xs text-gray-500 uppercase tracking-wider">
                  {source.category || "web"}
                </span>
              </div>
            </div>
            <CardTitle className="text-xs text-white line-clamp-2 leading-tight">
              {source.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-300 line-clamp-3 mb-2 leading-relaxed">
              {source.snippet}
            </p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="sm"
                variant="outline"
                className={`w-full transition-all duration-300 text-xs py-1 ${
                  relevanceScore > 0.8
                    ? "border-green-400/50 text-green-400 hover:bg-green-400/10 hover:shadow-md hover:shadow-green-400/20"
                    : relevanceScore > 0.6
                      ? "border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 hover:shadow-md hover:shadow-yellow-400/20"
                      : "border-red-400/50 text-red-400 hover:bg-red-400/10 hover:shadow-md hover:shadow-red-400/20"
                }`}
                onClick={onExplain}
              >
                <Brain className="w-3 h-3 mr-1" />
                Объяснить
                <Sparkles className="w-3 h-3 ml-1" />
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* Back of card */}
        <Card
          className="absolute inset-0 glass-morphism border-magenta-400/30 hover:border-magenta-400/60 shadow-md shadow-magenta-400/10"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        >
          <CardContent className="p-3 h-full flex flex-col justify-center">
            <motion.div
              className="space-y-2 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: isFlipped ? 1 : 0 }}
              transition={{ delay: isFlipped ? 0.2 : 0 }}
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Доверие:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${trustColor.replace("text-", "bg-")}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${trustScore * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                  <span className={trustColor}>
                    {(trustScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Релевантность:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${relevanceColor.replace("text-", "bg-")}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${relevanceScore * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                    />
                  </div>
                  <span className={relevanceColor}>
                    {(relevanceScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Источник:</span>
                <span className="text-white truncate ml-1 text-xs">
                  {getHostnameSafe(source.url) || "Неверный URL"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400">Категория:</span>
                <span className="text-cyan-400 text-xs uppercase tracking-wider">
                  {source.category || "general"}
                </span>
              </div>

              <motion.div
                className="mt-2 pt-2 border-t border-gray-600"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <div className="flex items-center justify-center space-x-1 text-xs text-gray-400">
                  <Globe className="w-2 h-2" />
                  <span>Проверено ИИ</span>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Cpu className="w-2 h-2" />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

// Main ResearchScanner Component
const ResearchScanner: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<
    "ready" | "thinking" | "fetching" | "synthesizing"
  >("ready");
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [results, setResults] = useState<ResearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [phaseProgress, setPhaseProgress] = useState<{ [key: number]: number }>(
    {},
  );
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [currentThinkingStep, setCurrentThinkingStep] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("ru-RU");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // New state for advanced visualization
  const [viewMode, setViewMode] = useState<"2d" | "3d" | "immersive">("2d");
  const [showGraph, setShowGraph] = useState(true);
  const [isGraphPlaying, setIsGraphPlaying] = useState(false);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [thoughtNodes, setThoughtNodes] = useState<ThoughtNode[]>([]);
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(
    null,
  );
  const [selectedThought, setSelectedThought] = useState<ThoughtNode | null>(
    null,
  );
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [showMetrics, setShowMetrics] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const phases = [
    {
      name: "Начальное исследование",
      icon: "📡",
      description: "Perplexity: Поиск и анализ источников",
      service: "Perplexity",
      color: "cyan",
      position: { x: 200, y: 150 },
    },
    {
      name: "Глубокий анализ",
      icon: "🧠",
      description: "Gemini: Семантический анализ данных",
      service: "Gemini",
      color: "purple",
      position: { x: 400, y: 200 },
    },
    {
      name: "Классификация и тегирование",
      icon: "🏷️",
      description: "OpenAI: Структурирование знаний",
      service: "OpenAI GPT-4",
      color: "green",
      position: { x: 600, y: 150 },
    },
    {
      name: "Синтез и валидация",
      icon: "🔄",
      description: "Multi-AI: Кросс-валидация результатов",
      service: "Multi-AI",
      color: "orange",
      position: { x: 800, y: 200 },
    },
    {
      name: "Финальный отчет",
      icon: "📋",
      description: "Orchestrator: Генерация отчета",
      service: "Research Orchestrator",
      color: "blue",
      position: { x: 1000, y: 150 },
    },
  ];

  const statusConfig = {
    ready: { color: "text-green-400", icon: "🟢", animation: "animate-pulse" },
    thinking: {
      color: "text-yellow-400",
      icon: "🟡",
      animation: "animate-spin",
    },
    fetching: {
      color: "text-blue-400",
      icon: "🔵",
      animation: "animate-bounce",
    },
    synthesizing: {
      color: "text-purple-400",
      icon: "🟣",
      animation: "neural-pulse",
    },
  };

  // Initialize graph nodes and edges
  useEffect(() => {
    const nodes: GraphNode[] = phases.map((phase, index) => ({
      id: `phase-${index}`,
      label: phase.name,
      type: "service" as const,
      service: phase.service,
      x: phase.position.x,
      y: phase.position.y,
      status: "pending" as const,
      connections: index < phases.length - 1 ? [`phase-${index + 1}`] : [],
      confidence: 0.8,
      timestamp: Date.now(),
    }));

    const edges: GraphEdge[] = [];
    for (let i = 0; i < phases.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        source: `phase-${i}`,
        target: `phase-${i + 1}`,
        type: "data-flow" as const,
        weight: 1,
        animated: true,
        status: "pending" as const,
      });
    }

    setGraphNodes(nodes);
    setGraphEdges(edges);
  }, []);

  const detectLanguage = (text: string): string => {
    const cyrillicPattern = /[а-яё]/i;
    const englishPattern = /[a-z]/i;

    const cyrillicCount = (text.match(cyrillicPattern) || []).length;
    const englishCount = (text.match(englishPattern) || []).length;

    if (cyrillicCount > englishCount) {
      return "ru-RU";
    } else if (englishCount > 0) {
      return "en-US";
    }
    return "ru-RU";
  };

  const handleVoiceToggle = () => {
    if (!isMounted) return;
    if ("webkitSpeechRecognition" in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = detectedLanguage;

      if (!isListening) {
        setIsListening(true);
        setIsTranscribing(true);
        recognition.start();

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }

          const detectedLang = detectLanguage(transcript);
          if (detectedLang !== detectedLanguage) {
            setDetectedLanguage(detectedLang);
            recognition.lang = detectedLang;
          }

          setQuery(transcript);

          if (event.results[event.results.length - 1].isFinal) {
            setIsListening(false);
            setIsTranscribing(false);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
          setIsTranscribing(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setIsTranscribing(false);
        };
      } else {
        recognition.stop();
        setIsListening(false);
        setIsTranscribing(false);
      }
    }
  };

  const updateGraphNodeStatus = (
    phaseIndex: number,
    status: "pending" | "active" | "completed" | "error",
  ) => {
    setGraphNodes((prev) =>
      prev.map((node) =>
        node.id === `phase-${phaseIndex}` ? { ...node, status } : node,
      ),
    );
  };

  const updateGraphEdgeStatus = (
    edgeIndex: number,
    status: "pending" | "active" | "completed",
  ) => {
    setGraphEdges((prev) =>
      prev.map((edge) =>
        edge.id === `edge-${edgeIndex}` ? { ...edge, status } : edge,
      ),
    );
  };

  const addThoughtNode = (
    service: string,
    thought: string,
    parentPhaseIndex: number,
  ) => {
    const newThought: ThoughtNode = {
      id: `thought-${Date.now()}-${Math.random()}`,
      service,
      thought,
      timestamp: Date.now(),
      confidence: Math.random() * 0.3 + 0.7,
      type: "analysis",
      parentId: `phase-${parentPhaseIndex}`,
      children: [],
    };

    setThoughtNodes((prev) => [...prev, newThought]);
  };

  const executeMultiStepResearch = async () => {
    setProgress(0);
    setCurrentPhase(0);
    setCompletedPhases([]);
    setPhaseProgress({});
    setThinkingSteps([]);
    setCurrentThinkingStep(0);
    setResults(null);
    setThoughtNodes([]);
    setIsGraphPlaying(true);

    const researchSteps = [
      {
        name: "Начальное исследование",
        service: "Perplexity",
        duration: 6000,
        thoughts: [
          "🔍 Анализирую запрос пользователя...",
          "📡 Сканирую доступные источники информации...",
          "🎯 Определяю ключевые темы для исследования...",
          "📊 Собираю первичные данные из надежных источников...",
          "🔗 Создаю базовую структуру знаний...",
          "✅ Передаю данные для глубокого анализа...",
        ],
      },
      {
        name: "Глубокий анализ",
        service: "Gemini",
        duration: 7000,
        thoughts: [
          "🧠 Получаю данные от Perplexity для анализа...",
          "🔬 Провожу семантический анализ содержимого...",
          "🕸️ Выявляю скрытые связи между концепциями...",
          "📈 Анализирую тренды и паттерны в данных...",
          "🎭 Определяю контекстуальные нюансы...",
          "🔄 Подготавливаю структурированные данные для OpenAI...",
          "✅ Завершаю семантический анализ...",
        ],
      },
      {
        name: "Классификация и тегирование",
        service: "OpenAI GPT-4",
        duration: 6500,
        thoughts: [
          "🏷️ Получаю обработанные данные от Gemini...",
          "📋 Создаю систему классификации для информации...",
          "🎯 Генерирую релевантные теги для каждого концепта...",
          "📊 Структурирую данные по категориям важности...",
          "🔍 Выделяю ключевые инсайты и выводы...",
          "🌐 Создаю граф знаний с тегированными узлами...",
          "✅ Передаю структурированные данные для валидации...",
        ],
      },
      {
        name: "Синтез и валидация",
        service: "Multi-AI",
        duration: 8000,
        thoughts: [
          "🔄 Синтезирую данные от всех AI-сервисов...",
          "✅ Провожу кросс-валидацию фактов через Perplexity...",
          "🧬 Объединяю анализ от Gemini в единую структуру...",
          "🎯 Выявляю противоречия и устраняю неточности...",
          "📊 Создаю финальную оценку достоверности...",
          "🌟 Формирую ключевые инсайты и выводы...",
          "🔗 Создаю связи между всеми компонентами исследования...",
          "✅ Подготавливаю данные для финального отчета...",
        ],
      },
      {
        name: "Финальный отчет",
        service: "Research Orchestrator",
        duration: 4000,
        thoughts: [
          "📋 Компилирую финальный исследовательский отчет...",
          "📊 Интегрирую все данные и анализ...",
          "🎨 Создаю визуализации и графы знаний...",
          "📈 Генерирую метрики качества исследования...",
          "✨ Финализирую презентацию результатов...",
          "🎯 Исследование завершено успешно!",
        ],
      },
    ];

    let allStepData: any[] = [];

    for (let stepIndex = 0; stepIndex < researchSteps.length; stepIndex++) {
      const step = researchSteps[stepIndex];
      setCurrentPhase(stepIndex);

      // Update graph node status
      updateGraphNodeStatus(stepIndex, "active");
      if (stepIndex > 0) {
        updateGraphEdgeStatus(stepIndex - 1, "active");
      }

      setStatus(
        stepIndex === 0
          ? "thinking"
          : stepIndex === 1
            ? "fetching"
            : stepIndex === 2
              ? "synthesizing"
              : "thinking",
      );

      // Add step thoughts gradually with enhanced timing
      for (
        let thoughtIndex = 0;
        thoughtIndex < step.thoughts.length;
        thoughtIndex++
      ) {
        const thoughtDelay =
          step.duration / step.thoughts.length / animationSpeed;
        await new Promise((resolve) => setTimeout(resolve, thoughtDelay));

        const currentThought = step.thoughts[thoughtIndex];

        // Add to thinking steps
        setThinkingSteps((prev) => {
          const newSteps = [...prev];
          const stepPrefix = `[${step.service}] `;
          newSteps.push(stepPrefix + currentThought);
          return newSteps;
        });
        setCurrentThinkingStep((prev) => prev + 1);

        // Add thought node to graph
        addThoughtNode(step.service, currentThought, stepIndex);

        // Update progress within step
        const stepProgress = ((thoughtIndex + 1) / step.thoughts.length) * 100;
        setPhaseProgress((prev) => ({
          ...prev,
          [stepIndex]: stepProgress,
        }));

        const overallProgress =
          ((stepIndex + (thoughtIndex + 1) / step.thoughts.length) /
            researchSteps.length) *
          100;
        setProgress(overallProgress);
      }

      // Call actual API for this step
      try {
        const { data, error } = await supabase.functions.invoke(
          "supabase-functions-perplexity-research",
          {
            body: {
              query,
              step: stepIndex,
              previousData: allStepData.length > 0 ? allStepData : null,
            },
          },
        );

        if (error) throw error;

        allStepData.push(data);

        // Update graph node with data
        setGraphNodes((prev) =>
          prev.map((node) =>
            node.id === `phase-${stepIndex}`
              ? { ...node, data, confidence: 0.9 }
              : node,
          ),
        );

        // Add completion thoughts
        setThinkingSteps((prev) => [
          ...prev,
          `[${step.service}] ✅ ${step.name} завершен успешно!`,
          `[${step.service}] 📊 Данные переданы на следующий этап...`,
        ]);
        setCurrentThinkingStep((prev) => prev + 2);

        // Add completion thought nodes
        addThoughtNode(
          step.service,
          `✅ ${step.name} завершен успешно!`,
          stepIndex,
        );
      } catch (error) {
        console.error(`Error in step ${stepIndex}:`, error);
        updateGraphNodeStatus(stepIndex, "error");
        setThinkingSteps((prev) => [
          ...prev,
          `[${step.service}] ❌ Ошибка на этапе ${step.name}`,
          `[${step.service}] 🔄 Переход к следующему этапу...`,
        ]);
      }

      // Mark phase as completed
      updateGraphNodeStatus(stepIndex, "completed");
      if (stepIndex > 0) {
        updateGraphEdgeStatus(stepIndex - 1, "completed");
      }
      setCompletedPhases((prev) => [...prev, stepIndex]);

      // Enhanced pause between steps
      await new Promise((resolve) =>
        setTimeout(resolve, 2000 / animationSpeed),
      );
    }

    // Set final results
    if (allStepData.length > 0) {
      const finalStepData = allStepData[allStepData.length - 1];
      if (finalStepData && finalStepData.data) {
        setResults(finalStepData.data);
      }
    }

    setStatus("ready");
    setProgress(100);
    setIsGraphPlaying(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    await executeMultiStepResearch();
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleGraphNodeClick = useCallback((node: GraphNode) => {
    setSelectedGraphNode(node);
  }, []);

  const handleThoughtClick = useCallback((thought: ThoughtNode) => {
    setSelectedThought(thought);
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-black text-white p-3">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-glow bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              📡 ResearchScanner Pro
            </h1>
            <p className="text-gray-400 text-sm">
              Advanced AI Research Interface with Immersive Visualization
            </p>
          </div>
          <div className="glass-morphism rounded-2xl p-4 border border-cyan-400/30">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Введите ваш исследовательский запрос для глубокого анализа..."
                  className="w-full bg-transparent border-none outline-none pl-12 pr-4 py-3 text-white placeholder-gray-400 text-lg font-light"
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-black text-white ${isFullscreen ? "fixed inset-0 z-50" : "p-3"}`}
    >
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Compact Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <motion.h1
              className="text-3xl font-bold text-glow bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              📡 ResearchScanner Pro
            </motion.h1>
            <p className="text-gray-400 text-sm">
              Advanced AI Research Interface with Immersive Visualization
            </p>

            {/* Compact Control Panel */}
            <motion.div
              className="flex justify-center items-center space-x-2 glass-morphism rounded-xl p-2 border border-cyan-400/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant={viewMode === "2d" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("2d")}
                    className="text-xs"
                  >
                    <Layers className="w-4 h-4 mr-1" />
                    2D
                  </Button>
                </TooltipTrigger>
                <TooltipContent>2D режим визуализации</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant={viewMode === "3d" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("3d")}
                    className="text-xs"
                  >
                    <Network className="w-4 h-4 mr-1" />
                    3D
                  </Button>
                </TooltipTrigger>
                <TooltipContent>3D режим визуализации</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant={showGraph ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowGraph(!showGraph)}
                    className="text-xs"
                  >
                    <Workflow className="w-4 h-4 mr-1" />
                    Граф
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Показать/скрыть граф исследования
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGraphPlaying(!isGraphPlaying)}
                    className="text-xs"
                  >
                    {isGraphPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Воспроизвести/приостановить анимацию
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-xs"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Полноэкранный режим</TooltipContent>
              </Tooltip>
            </motion.div>
          </motion.div>

          {/* Compact Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="relative glass-morphism rounded-2xl p-4 border border-cyan-400/30 pulse-neon">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите ваш исследовательский запрос для глубокого анализа..."
                    className="w-full bg-transparent border-none outline-none pl-12 pr-4 py-3 text-white placeholder-gray-400 text-lg font-light"
                  />
                </div>

                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleVoiceToggle}
                    className={`${isListening ? "text-red-400 neon-glow-magenta" : "text-cyan-400"} hover:bg-cyan-400/10 w-10 h-10`}
                  >
                    {isListening ? (
                      <div className="flex items-center space-x-2">
                        <MicOff className="w-6 h-6" />
                        {isTranscribing && (
                          <div className="flex space-x-1">
                            <motion.div
                              className="w-1 h-4 bg-red-400"
                              animate={{ scaleY: [1, 2, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                            />
                            <motion.div
                              className="w-1 h-3 bg-red-400"
                              animate={{ scaleY: [1, 1.5, 1] }}
                              transition={{
                                duration: 0.5,
                                repeat: Infinity,
                                delay: 0.1,
                              }}
                            />
                            <motion.div
                              className="w-1 h-5 bg-red-400"
                              animate={{ scaleY: [1, 2.5, 1] }}
                              transition={{
                                duration: 0.5,
                                repeat: Infinity,
                                delay: 0.2,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <Mic className="w-6 h-6" />
                    )}
                  </Button>
                </motion.div>

                <div
                  className={`flex items-center space-x-2 ${statusConfig[status].color}`}
                >
                  <motion.span
                    className={statusConfig[status].animation}
                    animate={{
                      scale: status === "thinking" ? [1, 1.2, 1] : 1,
                      rotate: status === "thinking" ? [0, 360] : 0,
                    }}
                    transition={{
                      duration: 2,
                      repeat: status === "thinking" ? Infinity : 0,
                    }}
                  >
                    {statusConfig[status].icon}
                  </motion.span>
                  <div className="flex flex-col">
                    <span className="text-xs font-mono uppercase tracking-wider">
                      {status === "ready"
                        ? "Готов"
                        : status === "thinking"
                          ? "Думаю"
                          : status === "fetching"
                            ? "Ищу"
                            : "Синтезирую"}
                    </span>
                    {detectedLanguage && (
                      <span className="text-xs text-gray-400">
                        {detectedLanguage === "ru-RU" ? "🇷🇺 RU" : "🇺🇸 EN"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Research Graph */}
            {showGraph &&
              (isLoading || graphNodes.some((n) => n.status !== "pending")) && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-morphism rounded-xl border border-purple-400/30 overflow-hidden"
                >
                  <div className="p-3 border-b border-purple-400/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-purple-400 flex items-center space-x-2">
                        <Network className="w-5 h-5" />
                        <span>Граф исследования</span>
                        {isGraphPlaying && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            <Activity className="w-4 h-4 text-cyan-400" />
                          </motion.div>
                        )}
                      </h3>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                          {animationSpeed}x
                        </span>
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.5"
                          value={animationSpeed}
                          onChange={(e) =>
                            setAnimationSpeed(parseFloat(e.target.value))
                          }
                          className="w-16"
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="h-80 cursor-pointer"
                    onClick={() => setIsGraphPlaying(!isGraphPlaying)}
                  >
                    <ResearchGraph
                      nodes={graphNodes}
                      edges={graphEdges}
                      thoughts={thoughtNodes}
                      onNodeClick={handleGraphNodeClick}
                      onThoughtClick={handleThoughtClick}
                      is3D={viewMode === "3d"}
                      isPlaying={isGraphPlaying}
                    />
                  </div>
                </motion.div>
              )}

            {/* Right Column - Thinking Process & Progress */}
            <div className="space-y-4">
              {/* Compact Thinking Process */}
              {isLoading && thinkingSteps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-morphism rounded-xl p-4 border border-cyan-400/30"
                >
                  <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center space-x-2">
                    <Brain className="w-5 h-5" />
                    <span>Процесс мышления ИИ</span>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                  </h3>

                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {thinkingSteps.map((step, index) => {
                      const isActive = index === currentThinkingStep - 1;
                      const isCompleted = index < currentThinkingStep - 1;

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -30, scale: 0.9 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            scale: isActive ? 1.02 : 1,
                          }}
                          transition={{
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 100,
                          }}
                          className={`flex items-center space-x-3 p-2 rounded-lg transition-all duration-700 ${
                            isActive
                              ? "bg-gradient-to-r from-cyan-400/20 to-purple-400/20 border border-cyan-400/50 shadow-lg shadow-cyan-400/20 neon-glow"
                              : isCompleted
                                ? "bg-gradient-to-r from-green-400/10 to-blue-400/10 border border-green-400/30 shadow-md shadow-green-400/10"
                                : "bg-gray-800/30 border border-gray-600/30"
                          }`}
                        >
                          <motion.div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              isActive
                                ? "bg-cyan-400 shadow-md shadow-cyan-400/50"
                                : isCompleted
                                  ? "bg-green-400 shadow-md shadow-green-400/50"
                                  : "bg-gray-600"
                            }`}
                            animate={{
                              scale: isActive ? [1, 1.3, 1] : 1,
                              boxShadow: isActive
                                ? [
                                    "0 0 10px rgba(6, 182, 212, 0.5)",
                                    "0 0 20px rgba(6, 182, 212, 0.8)",
                                    "0 0 10px rgba(6, 182, 212, 0.5)",
                                  ]
                                : "0 0 0px rgba(6, 182, 212, 0)",
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: isActive ? Infinity : 0,
                            }}
                          />

                          <span
                            className={`text-xs font-medium flex-1 ${
                              isActive
                                ? "text-cyan-300 font-semibold"
                                : isCompleted
                                  ? "text-green-300"
                                  : "text-gray-500"
                            }`}
                          >
                            {step}
                          </span>

                          {/* Service indicator */}
                          {step.includes("[") && (
                            <motion.div
                              className="ml-auto"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  step.includes("Perplexity")
                                    ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30"
                                    : step.includes("Gemini")
                                      ? "bg-purple-400/20 text-purple-400 border border-purple-400/30"
                                      : step.includes("OpenAI")
                                        ? "bg-green-400/20 text-green-400 border border-green-400/30"
                                        : step.includes("Multi-AI")
                                          ? "bg-orange-400/20 text-orange-400 border border-orange-400/30"
                                          : step.includes(
                                                "Research Orchestrator",
                                              )
                                            ? "bg-blue-400/20 text-blue-400 border border-blue-400/30"
                                            : "bg-gray-400/20 text-gray-400 border border-gray-400/30"
                                }`}
                              >
                                {step.match(/\[(.*?)\]/)?.[1] || "AI"}
                              </span>
                            </motion.div>
                          )}

                          {isActive && (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Loader2 className="w-4 h-4 text-cyan-400" />
                            </motion.div>
                          )}

                          {isCompleted && (
                            <motion.span
                              className="text-green-400 text-sm"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 200 }}
                            >
                              ✓
                            </motion.span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Enhanced Progress Visualization */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="glass-morphism rounded-2xl p-8 border border-purple-400/30">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-purple-400 flex items-center space-x-3">
                    <Target className="w-6 h-6" />
                    <span>Прогресс исследования</span>
                  </h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-mono text-gray-400">
                      {Math.round(progress)}%
                    </span>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Database className="w-5 h-5 text-purple-400" />
                    </motion.div>
                  </div>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="relative mb-8">
                  <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400 rounded-full relative"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/20 rounded-full"
                        animate={{
                          x: ["-100%", "100%"],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </motion.div>
                  </div>

                  <motion.div
                    className="absolute top-0 h-4 w-6 bg-white rounded-full shadow-xl"
                    style={{ left: `${Math.max(0, progress - 2)}%` }}
                    animate={{
                      boxShadow: [
                        "0 0 10px rgba(6, 182, 212, 0.5)",
                        "0 0 30px rgba(6, 182, 212, 0.8), 0 0 50px rgba(139, 92, 246, 0.6)",
                        "0 0 10px rgba(6, 182, 212, 0.5)",
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>

                {/* Enhanced Phase Grid */}
                <div className="grid grid-cols-5 gap-4">
                  {phases.map((phase, index) => {
                    const isCompleted = completedPhases.includes(index);
                    const isActive = index === currentPhase && isLoading;
                    const phaseProgressValue = phaseProgress[index] || 0;

                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{
                              opacity: isCompleted ? 0.8 : isActive ? 1 : 0.5,
                              scale: isActive ? 1.1 : isCompleted ? 0.95 : 1,
                              y: 0,
                            }}
                            transition={{
                              duration: 0.6,
                              ease: "easeOut",
                              delay: index * 0.1,
                            }}
                            className={`text-center p-6 rounded-2xl transition-all duration-700 relative overflow-hidden cursor-pointer ${
                              isCompleted
                                ? `bg-gradient-to-br from-${phase.color}-400/20 to-${phase.color}-600/20 border border-${phase.color}-400/50 shadow-lg shadow-${phase.color}-400/20`
                                : isActive
                                  ? `bg-gradient-to-br from-${phase.color}-400/30 to-${phase.color}-600/30 border border-${phase.color}-400/70 neon-glow shadow-2xl shadow-${phase.color}-400/30`
                                  : "bg-gray-800/50 border border-gray-600/50 hover:border-gray-500/70"
                            }`}
                            whileHover={{
                              scale: 1.05,
                              rotateY: 5,
                              z: 20,
                            }}
                          >
                            {/* Phase progress indicator */}
                            {isActive && (
                              <motion.div
                                className={`absolute bottom-0 left-0 h-2 bg-gradient-to-r from-${phase.color}-400 to-${phase.color}-600 transition-all duration-500`}
                                initial={{ width: 0 }}
                                animate={{ width: `${phaseProgressValue}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            )}

                            {/* Service indicator */}
                            <div className="absolute top-2 right-2">
                              <motion.div
                                className={`w-3 h-3 rounded-full ${
                                  isCompleted
                                    ? `bg-${phase.color}-400 shadow-lg shadow-${phase.color}-400/50`
                                    : isActive
                                      ? `bg-${phase.color}-400 shadow-lg shadow-${phase.color}-400/70`
                                      : "bg-gray-600"
                                }`}
                                animate={{
                                  scale: isActive ? [1, 1.3, 1] : 1,
                                  opacity: isActive ? [0.7, 1, 0.7] : 1,
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: isActive ? Infinity : 0,
                                }}
                              />
                            </div>

                            {/* Phase Icon */}
                            <motion.div
                              animate={{
                                rotate: isActive ? [0, 15, -15, 0] : 0,
                                scale: isActive
                                  ? [1, 1.2, 1]
                                  : isCompleted
                                    ? 0.9
                                    : 1,
                              }}
                              transition={{
                                duration: isActive ? 2.5 : 0.5,
                                repeat: isActive ? Infinity : 0,
                                ease: "easeInOut",
                              }}
                              className="text-4xl mb-4"
                            >
                              {isCompleted ? "✅" : phase.icon}
                            </motion.div>

                            {/* Phase Name */}
                            <div
                              className={`text-sm transition-colors duration-300 mb-2 font-semibold ${
                                isCompleted
                                  ? `text-${phase.color}-300`
                                  : isActive
                                    ? `text-${phase.color}-300 text-glow`
                                    : "text-gray-400"
                              }`}
                            >
                              {phase.name}
                            </div>

                            {/* Service Name */}
                            <div
                              className={`text-xs opacity-80 font-medium ${
                                isCompleted
                                  ? `text-${phase.color}-400`
                                  : isActive
                                    ? `text-${phase.color}-400`
                                    : "text-gray-500"
                              }`}
                            >
                              {phase.service}
                            </div>

                            {/* Active Animation Overlay */}
                            {isActive && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{
                                  opacity: [0.3, 0.7, 0.3],
                                  scale: [1, 1.05, 1],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                                className={`absolute inset-0 border-2 border-${phase.color}-400/50 rounded-2xl`}
                              />
                            )}

                            {/* Completion Sparkle Effect */}
                            {isCompleted && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute top-1 left-1"
                              >
                                <Sparkles
                                  className={`w-4 h-4 text-${phase.color}-400`}
                                />
                              </motion.div>
                            )}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-3 p-2">
                            <p className="font-semibold text-lg">
                              {phase.name}
                            </p>
                            <p className="text-sm text-gray-300">
                              {phase.description}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Сервис:</span>
                              <span
                                className={`text-${phase.color}-400 font-medium`}
                              >
                                {phase.service}
                              </span>
                            </div>
                            {isActive && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Прогресс:</span>
                                <span
                                  className={`text-${phase.color}-400 font-mono`}
                                >
                                  {Math.round(phaseProgressValue)}%
                                </span>
                              </div>
                            )}
                            {isCompleted && (
                              <p
                                className={`text-sm text-${phase.color}-400 font-medium flex items-center space-x-1`}
                              >
                                <span>Завершено</span>
                                <motion.span
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                >
                                  ✓
                                </motion.span>
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Compact Results Section */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Compact Main Answer */}
              <Card className="glass-morphism border-cyan-400/30 shadow-lg shadow-cyan-400/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-cyan-400 flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Brain className="w-5 h-5" />
                    </motion.div>
                    <span>Результаты исследования</span>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <motion.div
                    className="prose prose-invert max-w-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-gray-200 leading-relaxed text-sm">
                      {results.choices[0]?.message.content}
                    </p>
                  </motion.div>
                </CardContent>
              </Card>

              {/* Compact Sources Grid */}
              {results.citations && results.citations.length > 0 && (
                <div className="space-y-3">
                  <motion.h3
                    className="text-lg font-semibold text-cyan-400 flex items-center space-x-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Источники ({results.citations.length})</span>
                  </motion.h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <AnimatePresence>
                      {results.citations.map((citation, index) => (
                        <SourceCard
                          key={index}
                          source={citation}
                          onExplain={() => setShowChainOfThought(true)}
                          index={index}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Compact Footer Actions */}
              <motion.div
                className="flex flex-wrap gap-2 justify-center pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 hover:shadow-md hover:shadow-cyan-400/20 px-3 py-2"
                    onClick={handleSearch}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Повторить
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10 hover:shadow-md hover:shadow-purple-400/20 px-3 py-2"
                    onClick={() => setShowKnowledgeGraph(!showKnowledgeGraph)}
                  >
                    <Network className="w-4 h-4 mr-1" />
                    Граф
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 hover:shadow-md hover:shadow-yellow-400/20 px-3 py-2"
                    onClick={() => setShowReport(!showReport)}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Отчет
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-400/50 text-green-400 hover:bg-green-400/10 hover:shadow-md hover:shadow-green-400/20 px-3 py-2"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Сохранить
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-400/50 text-orange-400 hover:bg-orange-400/10 hover:shadow-md hover:shadow-orange-400/20 px-3 py-2"
                  >
                    <Share className="w-4 h-4 mr-1" />
                    Поделиться
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-400/50 text-blue-400 hover:bg-blue-400/10 hover:shadow-md hover:shadow-blue-400/20 px-3 py-2"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Экспорт
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default ResearchScanner;

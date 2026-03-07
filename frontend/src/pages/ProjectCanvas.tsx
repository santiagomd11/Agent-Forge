import { useCallback, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Plus, Play, FileText, Zap, CheckCircle } from 'lucide-react';
import { projectsApi, tasksApi } from '../api';
import { Button, Card, Select } from '../components/ui';
import type { Task } from '../types';

const typeConfig = {
  task: { icon: FileText, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: '#3b82f6' },
  workflow: { icon: Zap, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: '#22c55e' },
  approval: { icon: CheckCircle, color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: '#eab308' },
};

function TaskNode({ data }: { data: { label: string; type: string } }) {
  const config = typeConfig[data.type as keyof typeof typeConfig] || typeConfig.task;
  const Icon = config.icon;

  return (
    <div
      className="px-4 py-3 rounded-lg border-2 min-w-40 flex items-center gap-3 relative"
      style={{ borderColor: config.border, backgroundColor: config.bg }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-bg-secondary"
        style={{ background: config.color }}
      />
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: config.color }}
      >
        <Icon size={14} className="text-white" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: config.color }}>
          {data.type}
        </div>
        <div className="text-sm font-semibold text-text-primary leading-tight">{data.label}</div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !border-bg-secondary"
        style={{ background: config.color }}
      />
    </div>
  );
}

const nodeTypes = { taskNode: TaskNode };

export function ProjectCanvas() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [localNodeChanges, setLocalNodeChanges] = useState<Node[]>([]);
  const [localEdgeChanges, setLocalEdgeChanges] = useState<Edge[]>([]);
  const [hasLocalNodeChanges, setHasLocalNodeChanges] = useState(false);
  const [hasLocalEdgeChanges, setHasLocalEdgeChanges] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const prevNodesKey = useRef('');
  const prevEdgesKey = useRef('');

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId!),
  });

  const { data: projectNodes = [] } = useQuery({
    queryKey: ['projects', projectId, 'nodes'],
    queryFn: () => projectsApi.getNodes(projectId!),
  });

  const { data: projectEdges = [] } = useQuery({
    queryKey: ['projects', projectId, 'edges'],
    queryFn: () => projectsApi.getEdges(projectId!),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.list,
  });

  const taskMap = useMemo(() => {
    const map: Record<string, Task> = {};
    tasks.forEach((t) => (map[t.id] = t));
    return map;
  }, [tasks]);

  const apiNodes: Node[] = useMemo(
    () =>
      projectNodes.map((n) => ({
        id: n.id,
        type: 'taskNode' as const,
        position: { x: n.position_x, y: n.position_y },
        data: {
          label: taskMap[n.task_id]?.name || 'Unknown Task',
          type: taskMap[n.task_id]?.type || 'task',
          taskId: n.task_id,
        },
      })),
    [projectNodes, taskMap]
  );

  const apiEdges: Edge[] = useMemo(
    () =>
      projectEdges.map((e) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        label: `${e.source_output} -> ${e.target_input}`,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        labelStyle: { fill: '#8b90a8', fontSize: 10 },
        labelBgStyle: { fill: '#141821', fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
      })),
    [projectEdges]
  );

  const nodesKey = JSON.stringify(projectNodes.map((n) => n.id).sort());
  if (nodesKey !== prevNodesKey.current) {
    prevNodesKey.current = nodesKey;
    setHasLocalNodeChanges(false);
  }
  const edgesKey = JSON.stringify(projectEdges.map((e) => e.id).sort());
  if (edgesKey !== prevEdgesKey.current) {
    prevEdgesKey.current = edgesKey;
    setHasLocalEdgeChanges(false);
  }

  const nodes = hasLocalNodeChanges ? localNodeChanges : apiNodes;
  const edges = hasLocalEdgeChanges ? localEdgeChanges : apiEdges;

  const addNodeMutation = useMutation({
    mutationFn: (taskId: string) =>
      projectsApi.addNode(projectId!, {
        task_id: taskId,
        position_x: 100 + Math.random() * 300,
        position_y: 100 + Math.random() * 200,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'nodes'] });
      setShowAddTask(false);
      setSelectedTaskId('');
    },
  });

  const addEdgeMutation = useMutation({
    mutationFn: (conn: Connection) =>
      projectsApi.addEdge(projectId!, {
        source_node_id: conn.source!,
        target_node_id: conn.target!,
        source_output: 'output',
        target_input: 'input',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'edges'] });
    },
  });

  const updateNodePositionMutation = useMutation({
    mutationFn: ({ nodeId, x, y }: { nodeId: string; x: number; y: number }) =>
      projectsApi.updateNode(projectId!, nodeId, { position_x: x, position_y: y }),
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => projectsApi.deleteNode(projectId!, nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'nodes'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'edges'] });
      setSelectedNodeId(null);
    },
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: (edgeId: string) => projectsApi.deleteEdge(projectId!, edgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'edges'] });
    },
  });

  const runMutation = useMutation({
    mutationFn: () => projectsApi.run(projectId!),
    onSuccess: (result) => navigate(`/runs/${result.run_id}`),
  });

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const currentNodes = hasLocalNodeChanges ? localNodeChanges : apiNodes;
      const updated = applyNodeChanges(changes, currentNodes);
      setLocalNodeChanges(updated);
      setHasLocalNodeChanges(true);
    },
    [hasLocalNodeChanges, localNodeChanges, apiNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          deleteEdgeMutation.mutate(change.id);
        }
      }
      const currentEdges = hasLocalEdgeChanges ? localEdgeChanges : apiEdges;
      const updated = applyEdgeChanges(changes, currentEdges);
      setLocalEdgeChanges(updated);
      setHasLocalEdgeChanges(true);
    },
    [hasLocalEdgeChanges, localEdgeChanges, apiEdges, deleteEdgeMutation]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const currentEdges = hasLocalEdgeChanges ? localEdgeChanges : apiEdges;
      const updated = addEdge({ ...connection, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, currentEdges);
      setLocalEdgeChanges(updated);
      setHasLocalEdgeChanges(true);
      addEdgeMutation.mutate(connection);
    },
    [hasLocalEdgeChanges, localEdgeChanges, apiEdges, addEdgeMutation]
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      updateNodePositionMutation.mutate({
        nodeId: node.id,
        x: node.position.x,
        y: node.position.y,
      });
    },
    [updateNodePositionMutation]
  );

  const selectedNode = selectedNodeId
    ? projectNodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedTask = selectedNode ? taskMap[selectedNode.task_id] : null;

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-semibold">{project?.name || 'Loading...'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAddTask(true)}>
            <Plus size={14} />
            Add Task
          </Button>
          <Button size="sm" onClick={() => runMutation.mutate()}>
            <Play size={14} />
            Run
          </Button>
        </div>
      </div>

      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* Canvas */}
        <div className="flex-1" style={{ height: '100%' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            className="bg-bg-primary"
          >
            <Background color="#1c2038" gap={20} />
            <Controls className="!bg-bg-secondary !border-border [&>button]:!bg-bg-tertiary [&>button]:!border-border [&>button]:!text-text-secondary" />
            <MiniMap
              nodeColor="#6366f1"
              maskColor="rgba(15, 17, 23, 0.8)"
              className="!bg-bg-secondary !border-border"
            />
          </ReactFlow>
        </div>

        {/* Side panel */}
        {selectedTask && (
          <div className="w-72 border-l border-border bg-bg-secondary p-4 overflow-y-auto">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-accent/20 flex items-center justify-center">
                <span className="w-2 h-2 rounded-sm bg-accent" />
              </span>
              Node Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-text-muted">Task</span>
                <p className="text-sm font-medium">{selectedTask.name}</p>
              </div>
              <div>
                <span className="text-xs text-text-muted">Type</span>
                <p className="text-sm capitalize">{selectedTask.type}</p>
              </div>
              <div>
                <span className="text-xs text-text-muted">Model</span>
                <p className="text-sm font-mono">{selectedTask.provider} / {selectedTask.model}</p>
              </div>
              {selectedTask.computer_use && (
                <div className="text-xs text-warning bg-warning/10 rounded px-2.5 py-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  Computer use enabled
                </div>
              )}
              <div className="border-t border-border pt-4">
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (confirm('Remove this node?')) deleteNodeMutation.mutate(selectedNodeId!);
                  }}
                >
                  Remove Node
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add task modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <Card className="w-96">
            <h2 className="text-lg font-semibold mb-4">Add Task to Canvas</h2>
            {tasks.length === 0 ? (
              <p className="text-text-muted text-sm mb-4">
                No tasks available. Create a task first.
              </p>
            ) : (
              <Select
                label="Select a task"
                options={[
                  { value: '', label: 'Choose...' },
                  ...tasks.map((t) => ({ value: t.id, label: t.name })),
                ]}
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="mb-4"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowAddTask(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedTaskId}
                onClick={() => addNodeMutation.mutate(selectedTaskId)}
              >
                Add
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

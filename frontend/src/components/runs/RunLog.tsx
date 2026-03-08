import { useState } from 'react';
import type { WSEvent } from '../../types';

interface RunLogProps {
  events: WSEvent[];
  outputs: Record<string, unknown>;
}

export function RunLog({ events, outputs }: RunLogProps) {
  const [showRaw, setShowRaw] = useState(false);

  const logLines = events
    .filter((e) => e.type === 'agent_completed' || e.type === 'run_completed' || e.type === 'run_failed')
    .map((e) => {
      if (e.type === 'run_failed') return `ERROR: ${JSON.stringify(e.data?.error ?? 'Unknown error')}`;
      if (e.type === 'run_completed') return `COMPLETED: ${JSON.stringify(e.data?.outputs ?? {})}`;
      return JSON.stringify(e.data ?? {}, null, 2);
    });

  const hasOutputs = Object.keys(outputs).length > 0;
  const rawResult = typeof outputs.result === 'string' ? outputs.result : null;

  // If the result is a JSON string, try to extract readable text from it
  let resultText = rawResult;
  if (rawResult) {
    try {
      const parsed = JSON.parse(rawResult);
      if (typeof parsed === 'object' && parsed !== null) {
        // Extract text from known field names, or join all string values
        const textFields = Object.values(parsed).filter((v): v is string => typeof v === 'string');
        if (textFields.length > 0) {
          resultText = textFields.join('\n\n');
        }
      }
    } catch {
      // Not JSON, use as-is
    }
  }
  const isError = outputs.is_error === true;
  const cost = typeof outputs.total_cost_usd === 'number' ? outputs.total_cost_usd : null;
  const turns = typeof outputs.num_turns === 'number' ? outputs.num_turns : null;
  const durationMs = typeof outputs.duration_ms === 'number' ? outputs.duration_ms : null;

  return (
    <div className="space-y-3">
      {hasOutputs && resultText ? (
        <>
          <div className={`bg-bg-primary border rounded-lg p-4 overflow-auto max-h-[500px] ${isError ? 'border-danger/40' : 'border-border'}`}>
            <pre className={`text-sm whitespace-pre-wrap ${isError ? 'text-danger' : 'text-text-primary'}`}>
              {resultText}
            </pre>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            {turns !== null && <span>{turns} turn{turns !== 1 ? 's' : ''}</span>}
            {durationMs !== null && <span>{(durationMs / 1000).toFixed(1)}s</span>}
            {cost !== null && <span>${cost.toFixed(4)}</span>}
            <button
              type="button"
              className="text-accent hover:underline ml-auto"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? 'Hide' : 'Show'} raw output
            </button>
          </div>
          {showRaw && (
            <div className="bg-bg-primary border border-border rounded-lg p-4 font-mono text-xs overflow-auto max-h-[300px]">
              <pre className="text-text-secondary whitespace-pre-wrap">
                {JSON.stringify(outputs, null, 2)}
              </pre>
            </div>
          )}
        </>
      ) : hasOutputs ? (
        <div className="bg-bg-primary border border-border rounded-lg p-4 font-mono text-xs overflow-auto max-h-[500px]">
          <pre className="text-text-primary whitespace-pre-wrap">
            {JSON.stringify(outputs, null, 2)}
          </pre>
        </div>
      ) : logLines.length > 0 ? (
        <div className="bg-bg-primary border border-border rounded-lg p-4 font-mono text-xs overflow-auto max-h-[500px]">
          {logLines.map((line, i) => (
            <div key={i} className="text-text-secondary py-0.5">{line}</div>
          ))}
        </div>
      ) : (
        <div className="bg-bg-primary border border-border rounded-lg p-4 font-mono text-xs">
          <div className="text-text-muted">No output yet.</div>
        </div>
      )}
    </div>
  );
}

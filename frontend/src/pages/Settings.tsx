import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui';

export function Settings() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch('/api/health').then((r) => r.json()),
  });

  const { data: computerUse } = useQuery({
    queryKey: ['computer-use-status'],
    queryFn: () => fetch('/api/computer-use/status').then((r) => r.json()),
  });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Settings</h1>

      <div className="space-y-4">
        <Card>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">API Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Status</span>
              <span className={health?.status === 'healthy' ? 'text-success' : 'text-error'}>
                {health?.status || 'unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Version</span>
              <span>{health?.version || '-'}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Computer Use</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Available</span>
              <span className={computerUse?.available ? 'text-success' : 'text-text-muted'}>
                {computerUse?.available ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Platform</span>
              <span>{computerUse?.platform || '-'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { TaskEditor } from './pages/TaskEditor';
import { TaskDetail } from './pages/TaskDetail';
import { Projects } from './pages/Projects';
import { ProjectEditor } from './pages/ProjectEditor';
import { ProjectCanvas } from './pages/ProjectCanvas';
import { Runs } from './pages/Runs';
import { RunViewer } from './pages/RunViewer';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/new" element={<TaskEditor />} />
            <Route path="/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/tasks/:taskId/edit" element={<TaskEditor />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectEditor />} />
            <Route path="/runs" element={<Runs />} />
            <Route path="/runs/:runId" element={<RunViewer />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* Canvas gets full height, no sidebar layout */}
          <Route path="/projects/:projectId" element={<ProjectCanvas />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

import { Route, Routes, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Investigations from './pages/Investigations';
import EvidencePage from './pages/EvidencePage';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Connectors from './pages/Connectors';
import JobMonitor from './pages/JobMonitor';
import EvidenceExplorer from './pages/EvidenceExplorer';

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">AEGIS</div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/investigations">Investigations</Link>
          <Link to="/evidence">Evidence</Link>
          <Link to="/explorer">Explorer</Link>
          <Link to="/sources">Sources</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/settings">Settings</Link>
        </nav>
      </aside>
      <main className="main-panel">
        <Routes>
          <Route path="/" element={<Navigate replace to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/investigations" element={<Investigations />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/explorer" element={<EvidenceExplorer />} />
          <Route path="/sources" element={<Connectors />} />
          <Route path="/jobs" element={<JobMonitor />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

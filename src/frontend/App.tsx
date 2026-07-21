import { useEffect, useState } from 'react';
import { Route, Routes, Link, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Investigations from './pages/Investigations';
import EvidencePage from './pages/EvidencePage';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Connectors from './pages/Connectors';
import JobMonitor from './pages/JobMonitor';
import EvidenceExplorer from './pages/EvidenceExplorer';
import RelationshipExplorer from './pages/RelationshipExplorer';
import EntityProfiles from './pages/EntityProfiles';
import Claims from './pages/Claims';
import Timeline from './pages/Timeline';
import Assistant from './pages/Assistant';
import Reliability from './pages/Reliability';
import IngestionQueue from './pages/IngestionQueue';
import DifferenceEngine from './pages/DifferenceEngine';
import Search2 from './pages/Search2';
import ReportGenerator from './pages/ReportGenerator';
import Plugins from './pages/Plugins';
import DevConsole from './pages/DevConsole';
import CommandPalette from './components/CommandPalette';

export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">AEGIS</div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/investigations">Investigations</Link>
          <Link to="/evidence">Evidence</Link>
          <Link to="/explorer">Explorer</Link>
          <Link to="/graph">Knowledge Graph</Link>
          <Link to="/profiles">Entity Profiles</Link>
          <Link to="/claims">Claims</Link>
          <Link to="/timeline">Timeline</Link>
          <Link to="/assistant">Assistant</Link>
          <Link to="/sources">Sources</Link>
          <Link to="/reliability">Reliability</Link>
          <Link to="/ingestion">Ingestion</Link>
          <Link to="/diff">Difference Engine</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/search2">Search 2.0</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/report-generator">Report Generator</Link>
          <Link to="/plugins">Plugins</Link>
          <Link to="/devconsole">Dev Console</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <div style={{ padding: '12px 20px', color: '#64748b', fontSize: 11, borderTop: '1px solid #1e293b', marginTop: 'auto' }}>
          Press Ctrl+K for command palette
        </div>
      </aside>
      <main className="main-panel">
        <Routes>
          <Route path="/" element={<Navigate replace to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/investigations" element={<Investigations />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/explorer" element={<EvidenceExplorer />} />
          <Route path="/graph" element={<RelationshipExplorer />} />
          <Route path="/profiles" element={<EntityProfiles />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/sources" element={<Connectors />} />
          <Route path="/reliability" element={<Reliability />} />
          <Route path="/ingestion" element={<IngestionQueue />} />
          <Route path="/diff" element={<DifferenceEngine />} />
          <Route path="/jobs" element={<JobMonitor />} />
          <Route path="/search2" element={<Search2 />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/report-generator" element={<ReportGenerator />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/devconsole" element={<DevConsole />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={(path) => navigate(path)} />
    </div>
  );
}

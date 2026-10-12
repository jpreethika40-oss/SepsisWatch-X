import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

// 14 Pages
import { CommandCenter } from './pages/CommandCenter';
import { PatientDetail } from './pages/PatientDetail';
import { WhatIfLab } from './pages/WhatIfLab';
import { ModelArena } from './pages/ModelArena';
import { AlertCenter } from './pages/AlertCenter';
import { AlarmBudgetControl } from './pages/AlarmBudgetControl';
import { Scoreboard } from './pages/Scoreboard';
import { DriftMonitor } from './pages/DriftMonitor';
import { InsightsLab } from './pages/InsightsLab';
import { BenchmarkErrorAnalysis } from './pages/BenchmarkErrorAnalysis';
import { Experiments } from './pages/Experiments';
import { DataUpload } from './pages/DataUpload';
import { Admin } from './pages/Admin';
import { About } from './pages/About';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/patient" element={<PatientDetail />} />
          <Route path="/what-if" element={<WhatIfLab />} />
          <Route path="/arena" element={<ModelArena />} />
          <Route path="/alerts" element={<AlertCenter />} />
          <Route path="/policy" element={<AlarmBudgetControl />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
          <Route path="/drift" element={<DriftMonitor />} />
          <Route path="/insights" element={<InsightsLab />} />
          <Route path="/benchmark" element={<BenchmarkErrorAnalysis />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/upload" element={<DataUpload />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/about" element={<About />} />
          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;

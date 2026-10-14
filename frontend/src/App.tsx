import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

// Core Application Workspaces & Pages
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
import { GradioStudio } from './pages/GradioStudio';
import { LoginPage } from './pages/LoginPage';

// Dedicated Role Workspaces & AI Assistant
import { DoctorDashboard } from './pages/DoctorDashboard';
import { NurseDashboard } from './pages/NurseDashboard';
import { ChiefDashboard } from './pages/ChiefDashboard';
import { Assistant } from './pages/Assistant';

import { useStore } from './store/useStore';

export const App: React.FC = () => {
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          {/* Main 3D Command Center */}
          <Route path="/" element={<CommandCenter />} />

          {/* Role-Specific Workspaces */}
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/nurse" element={<NurseDashboard />} />
          <Route path="/chief" element={<ChiefDashboard />} />

          {/* Clinical AI Assistant */}
          <Route path="/assistant" element={<Assistant />} />

          {/* Clinical Operations & Telemetry */}
          <Route path="/patient" element={<PatientDetail />} />
          <Route path="/what-if" element={<WhatIfLab />} />
          <Route path="/arena" element={<ModelArena />} />
          <Route path="/gradio-studio" element={<GradioStudio />} />
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

          {/* Rubric Removal Redirects */}
          <Route path="/rubric" element={<Navigate to="/" replace />} />
          <Route path="/api-explorer" element={<Navigate to="/" replace />} />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;

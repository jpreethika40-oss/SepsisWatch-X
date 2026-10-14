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
  const { isAuthenticated, currentRole } = useStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const defaultRedirect = currentRole === 'doctor' ? '/doctor' : currentRole === 'nurse' ? '/nurse' : '/chief';

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          {/* Nurse-Specific Clinical Route Tree */}
          {currentRole === 'nurse' && (
            <>
              <Route path="/nurse" element={<NurseDashboard />} />
              <Route path="/patient" element={<PatientDetail />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="*" element={<Navigate to="/nurse" replace />} />
            </>
          )}

          {/* Doctor-Specific Attending Diagnostic Route Tree */}
          {currentRole === 'doctor' && (
            <>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/" element={<CommandCenter />} />
              <Route path="/patient" element={<PatientDetail />} />
              <Route path="/alerts" element={<AlertCenter />} />
              <Route path="/what-if" element={<WhatIfLab />} />
              <Route path="/insights" element={<InsightsLab />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/gradio-studio" element={<GradioStudio />} />
              <Route path="*" element={<Navigate to="/doctor" replace />} />
            </>
          )}

          {/* Chief-Specific Executive Governance Route Tree */}
          {currentRole === 'hospital_chief' && (
            <>
              <Route path="/chief" element={<ChiefDashboard />} />
              <Route path="/benchmark" element={<BenchmarkErrorAnalysis />} />
              <Route path="/policy" element={<AlarmBudgetControl />} />
              <Route path="/scoreboard" element={<Scoreboard />} />
              <Route path="/drift" element={<DriftMonitor />} />
              <Route path="/upload" element={<DataUpload />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/about" element={<About />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="*" element={<Navigate to="/chief" replace />} />
            </>
          )}

          {/* Fallback to Role Default */}
          <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;

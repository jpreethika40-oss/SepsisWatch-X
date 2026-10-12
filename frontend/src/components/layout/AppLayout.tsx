import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen w-screen bg-clinical-bg text-clinical-text overflow-hidden selection:bg-cyan-500 selection:text-white">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-radial-gradient">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
};

import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { AuthModal } from './AuthModal';
import { useWebSocketStream } from '../../services/useWebSocketStream';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Activate real-time ICU ward stream
  useWebSocketStream();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0C0B0A] text-[#F3EEE8] overflow-hidden selection:bg-[#F97316] selection:text-[#0C0B0A]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0C0B0A]">
          {children}
        </main>
      </div>
      <CommandPalette />
      <AuthModal />
    </div>
  );
};

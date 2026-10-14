import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Rubric UI has been completely superseded and removed per clinical platform specifications.
 * All legacy /rubric routes redirect cleanly to the 3D Command Center.
 */
export const RubricCenter: React.FC = () => {
  return <Navigate to="/" replace />;
};

export default RubricCenter;

import React from 'react';
import ReactDOM from 'react-dom/client';
import UWAssignmentTracker from './UWAssignmentTracker.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <UWAssignmentTracker />
    </ErrorBoundary>
  </React.StrictMode>
);

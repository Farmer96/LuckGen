import React, { useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import LotteryView from './components/LotteryView';

// Simple view router for the demo since we can't use real URL routing easily in this environment
type ViewState = 'ADMIN' | 'LOTTERY';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('ADMIN');

  return (
    <div className="antialiased">
      {view === 'ADMIN' ? (
        <AdminDashboard onLaunch={() => setView('LOTTERY')} />
      ) : (
        <LotteryView onBack={() => setView('ADMIN')} />
      )}
    </div>
  );
};

export default App;

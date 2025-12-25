import React, { useEffect, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import LotteryView from './components/LotteryView';
import AdminLogin from './components/AdminLogin'; // 引入刚才写的新组件

const App: React.FC = () => {
  const [isLotteryMode, setIsLotteryMode] = useState(false);
  
  // 新增状态：是否已经通过了密码验证
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    setIsLotteryMode(mode === 'lottery');
  }, []);

  const handleLaunch = () => {
    // 这里使用 window.open 打开新窗口，方便你保留后台，同时给别人看抽奖页
    window.open(window.location.pathname + '?mode=lottery', '_blank');
  };

  const handleBackToAdmin = () => {
    // 抽奖页如果想回后台，清空 URL 参数
    // 注意：从抽奖页跳回后台，通常需要重新输入密码，这是安全的表现
    window.location.search = ''; 
  };

  // --- 路由逻辑判断 ---

  // 1. 如果是抽奖模式，直接显示抽奖页，任何人都不需要密码
  if (isLotteryMode) {
    return <LotteryView onBack={handleBackToAdmin} />;
  }

  // 2. 如果不是抽奖模式（即后台模式），先看有没有登录
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // 3. 登录成功，显示管理后台
  return <AdminDashboard onLaunch={handleLaunch} />;
};

export default App;
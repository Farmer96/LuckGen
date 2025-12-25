import React, { useState, useEffect } from 'react';
import { checkEligibility, performDraw, getLotteryData, saveLotteryData } from '../services/mockDatabase';
import { LotteryConfig, User, DrawResult, Prize } from '../types';
import { Gift, Award, Clock, History, AlertCircle } from 'lucide-react';

interface LotteryViewProps {
  onBack: () => void;
}

const LotteryView: React.FC<LotteryViewProps> = ({ onBack }) => {
  const [config, setConfig] = useState<LotteryConfig | null>(null);
  const [step, setStep] = useState<'LOGIN' | 'LOTTERY'>('LOGIN');
  
  // User State
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // UI State
  const [error, setError] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winResult, setWinResult] = useState<{prize: Prize | null, record: DrawResult} | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Poll for data updates (simulating real-time config changes like new users)
    const loadData = () => {
        const data = getLotteryData();
        setConfig(data);
        // Also update current user if logged in to reflect new chance counts
        if (data && currentUser) {
            const updatedUser = data.allowedUsers.find(u => u.phone === currentUser.phone);
            if (updatedUser) setCurrentUser(updatedUser);
        }
    };
    
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [currentUser?.phone]); // Reload if currentUser ID changes to sync

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!config) return;

    const { eligible, message, user } = checkEligibility(phone, name);
    
    if (eligible && user) {
      setCurrentUser(user);
      setStep('LOTTERY');
    } else if (user) {
        // User exists but has no chances or other issue, still let them in to see history
        setCurrentUser(user);
        setStep('LOTTERY');
        // If message was "no chances", we show that on the main screen
    } else {
      setError(message);
    }
  };

  const handleDraw = () => {
    if (!currentUser) return;
    if (isSpinning) return;
    
    // Check eligibility again strictly before draw
    const { eligible, message } = checkEligibility(currentUser.phone, currentUser.name);
    if (!eligible) {
        alert(message);
        return;
    }

    setIsSpinning(true);
    setWinResult(null);

    // Simulate network/animation delay
    setTimeout(() => {
        const { result, prize, error: drawError } = performDraw(currentUser.phone);
        
        if (drawError || !result) {
            setIsSpinning(false);
            alert(drawError || "抽奖失败");
            return;
        }

        // Animation finish
        setWinResult({ prize, record: result });
        setIsSpinning(false);
        
        // Refresh local user state immediately
        const data = getLotteryData();
        if(data) {
             const u = data.allowedUsers.find(x => x.phone === currentUser.phone);
             if(u) setCurrentUser(u);
        }
        
    }, 2000);
  };

  if (!config) return <div className="h-screen flex items-center justify-center text-white bg-gray-900">活动加载中...</div>;

  return (
    <div className="min-h-screen lottery-bg flex flex-col items-center justify-start pb-10 text-white relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-64 bg-white opacity-5 rounded-b-[50%] transform scale-x-150"></div>
        {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white opacity-10 animate-pulse" 
                style={{
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    width: Math.random() * 10 + 5 + 'px',
                    height: Math.random() * 10 + 5 + 'px',
                    animationDuration: Math.random() * 2 + 1 + 's'
                }}
            />
        ))}
      </div>

      {/* Header */}
      <div className="w-full max-w-md z-10 p-6 text-center">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-md tracking-tight mb-2">
            {config.title || "幸运大抽奖"}
        </h1>
        <p className="text-white/80 text-sm mb-4 bg-black/20 p-2 rounded-lg inline-block backdrop-blur-sm">
            {config.description}
        </p>
        <div className="flex justify-center items-center gap-2 text-xs font-mono bg-white/10 py-1 px-3 rounded-full w-fit mx-auto">
            <Clock className="w-3 h-3" />
            结束时间: {new Date(config.endTime).toLocaleDateString()}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md px-4 z-10 flex-1 flex flex-col">
        
        {step === 'LOGIN' && (
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-gray-800 mt-4">
            <h2 className="text-xl font-bold text-center mb-6 text-gray-900">参与者登录</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="请输入手机号"
                />
              </div>
              
              {config.participantType === 'PUBLIC' && (
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">您的姓名</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border-gray-300 border p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                      placeholder="请输入姓名"
                    />
                 </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                </div>
              )}

              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform transition-transform active:scale-95">
                验证并进入
              </button>
            </form>
          </div>
        )}

        {step === 'LOTTERY' && currentUser && (
          <div className="flex flex-col items-center">
            
            {/* Stats Card */}
            <div className="w-full bg-white/10 backdrop-blur-md rounded-xl p-4 flex justify-between items-center mb-8 border border-white/20">
                <div className="text-left">
                    <p className="text-xs text-white/70">欢迎您，</p>
                    <p className="font-bold">{currentUser.name || currentUser.phone}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-white/70">剩余次数</p>
                    <p className="font-bold text-xl text-yellow-300">{currentUser.totalChances - currentUser.usedChances}</p>
                </div>
            </div>

            {/* The "Wheel" / Box */}
            <div className="relative mb-8 group">
                {/* Glow behind */}
                <div className={`absolute -inset-4 bg-yellow-400 rounded-full blur-xl opacity-50 transition-all duration-300 ${isSpinning ? 'scale-110 opacity-80' : 'scale-100'}`}></div>
                
                <button 
                    onClick={handleDraw}
                    disabled={isSpinning || (currentUser.totalChances - currentUser.usedChances <= 0)}
                    className={`relative w-48 h-48 bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-500 rounded-full shadow-[0_10px_20px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center border-4 border-yellow-200 transition-all duration-300 
                    ${isSpinning ? 'animate-[spin_0.5s_linear_infinite]' : 'hover:scale-105 active:scale-95'}
                    ${(currentUser.totalChances - currentUser.usedChances <= 0) ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                    `}
                >
                    <div className={`${isSpinning ? 'opacity-50' : 'opacity-100'}`}>
                        <Gift className="w-12 h-12 text-red-700 mb-1" />
                        <span className="text-red-900 font-black text-xl uppercase tracking-wider">
                            {isSpinning ? '...' : '抽奖'}
                        </span>
                    </div>
                </button>
            </div>

             {/* Result Modal Overlay */}
             {winResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s]">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl transform animate-[bounceIn_0.5s]">
                        <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                            {winResult.prize ? <Award className="w-10 h-10 text-yellow-600" /> : <Gift className="w-10 h-10 text-gray-400" />}
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {winResult.prize ? "恭喜中奖！" : "很遗憾"}
                        </h3>
                        <p className="text-gray-600 mb-6 text-lg">
                            {winResult.prize ? `您获得了：${winResult.prize.name}` : "本次未中奖，感谢参与。"}
                        </p>
                        
                        <div className="space-y-3">
                             {winResult.prize && (
                                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm text-yellow-800">
                                    {winResult.prize.description || "请联系管理员领奖。"}
                                </div>
                             )}
                             <button 
                                onClick={() => setWinResult(null)}
                                className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
                            >
                                {currentUser.totalChances - currentUser.usedChances > 0 ? "再试一次" : "关闭"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm"
            >
                <History className="w-4 h-4" />
                {showHistory ? "收起记录" : "查看我的记录"}
            </button>

            {showHistory && (
                <div className="w-full bg-white rounded-xl shadow-lg overflow-hidden animate-[slideUp_0.3s]">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                        <h3 className="text-gray-700 font-bold text-sm">中奖记录</h3>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {config.drawRecords.filter(r => r.userPhone === currentUser.phone).length === 0 ? (
                            <p className="text-center py-4 text-gray-400 text-sm">暂无记录。</p>
                        ) : (
                            config.drawRecords
                                .filter(r => r.userPhone === currentUser.phone)
                                .map(r => (
                                <div key={r.id} className="border-b border-gray-100 px-4 py-3 flex justify-between items-center last:border-0">
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${r.prizeId ? 'text-green-600' : 'text-gray-500'}`}>
                                            {r.prizeName}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(r.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {r.prizeId && <Award className="w-4 h-4 text-yellow-500" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
      
      {/* Hidden back button for demo purposes */}
      <button onClick={onBack} className="absolute bottom-2 right-2 text-white/20 hover:text-white/50 text-xs">
        管理后台
      </button>
    </div>
  );
};

export default LotteryView;
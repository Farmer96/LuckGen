import React, { useState, useEffect, useRef } from 'react';
import { checkEligibility, performDraw, getLotteryData, saveLotteryData } from '../services/client'; // 同样确保引用正确
import { LotteryConfig, User, DrawResult, Prize } from '../types';
import { Gift, Award, Clock, History, AlertCircle, Sparkles, X, Trophy, ChevronDown } from 'lucide-react';

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
  const [showHistory, setShowHistory] = useState(false); // 控制底部抽屉
  
  // 滚动文字状态
  const [rollingText, setRollingText] = useState("点击抽奖");
  const rollingIntervalRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
        const data = await getLotteryData();
        setConfig(data);
        if (data && currentUser) {
            const updatedUser = data.allowedUsers.find(u => u.phone === currentUser.phone);
            if (updatedUser) setCurrentUser(updatedUser);
        }
    };
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [currentUser?.phone]);

  // 修复点：修正了这里的语法错误
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!config) return;
    const { eligible, message, user } = await checkEligibility(phone, name);
    
    // 简单的震动反馈
    if (navigator.vibrate) navigator.vibrate(50);

    if (eligible && user) {
      setCurrentUser(user);
      setStep('LOTTERY');
    } else if (user) {
        // 即使没有资格（次数用完），如果是合法用户也让进，进去再显示次数为0
        setCurrentUser(user);
        setStep('LOTTERY');
    } else {
      setError(message);
    }
  };

  const startRollingEffect = () => {
    const texts = ["🤞 祈祷中...", "💎 大奖...", "🍀 运气...", "🎁 是什么..."];
    let i = 0;
    rollingIntervalRef.current = setInterval(() => {
        setRollingText(texts[i % texts.length]);
        i++;
    }, 150);
  };

  const stopRollingEffect = () => {
    if (rollingIntervalRef.current) clearInterval(rollingIntervalRef.current);
    setRollingText("点击抽奖");
  };

  const handleDraw = async () => {
    if (!currentUser || isSpinning) return;
    
    // 手机震动反馈
    if (navigator.vibrate) navigator.vibrate(100);

    const { eligible, message } = await checkEligibility(currentUser.phone, currentUser.name);
    if (!eligible) {
        alert(message);
        return;
    }

    setIsSpinning(true);
    setWinResult(null);
    startRollingEffect();

    setTimeout(async () => {
        const { result, prize, error: drawError } = await performDraw(currentUser.phone);
        stopRollingEffect();
        setIsSpinning(false);
        
        if (drawError || !result) {
            alert(drawError || "抽奖失败");
            return;
        }

        setWinResult({ prize, record: result });
        // 中奖强烈震动
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        // 刷新用户状态
        const data = await getLotteryData();
        if(data) {
             const u = data.allowedUsers.find(x => x.phone === currentUser.phone);
             if(u) setCurrentUser(u);
        }
        
    }, 2000); // 2秒对于手机用户来说等待感刚好
  };

  if (!config) return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">加载活动...</div>;

  const remainingChances = currentUser ? (currentUser.totalChances - currentUser.usedChances) : 0;

  return (
    // 使用 h-[100dvh] 确保在移动端浏览器（含地址栏）中也能完美全屏
    <div className="h-[100dvh] w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900 via-red-950 to-black text-white relative overflow-hidden font-sans flex flex-col">
      
      {/* --- 动态背景 --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[150%] h-[50%] bg-red-600/20 blur-[80px] rounded-full"></div>
        {/* 少量漂浮粒子，避免手机卡顿 */}
        {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-yellow-400/20 animate-pulse" 
                style={{
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    width: Math.random() * 4 + 2 + 'px',
                    height: Math.random() * 4 + 2 + 'px',
                    animationDuration: Math.random() * 3 + 2 + 's'
                }}
            />
        ))}
      </div>

      {/* --- 顶部区域 (Logo & 标题) --- */}
      <div className="relative z-10 px-6 pt-12 pb-4 text-center flex-shrink-0">
         {/* 装饰性小标 */}
         <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm text-[10px] text-yellow-200 mb-4 shadow-lg">
            <Sparkles className="w-3 h-3" />
            <span>{config.participantType === 'PUBLIC' ? '公开活动' : '内部福利'}</span>
         </div>
         
         <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-md leading-tight">
            {config.title || "幸运大转盘"}
         </h1>
         <p className="text-white/60 text-xs mt-2 line-clamp-2 px-4">
            {config.description}
         </p>
      </div>

      {/* --- 中间主体内容 (自动撑开，居中) --- */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full px-6">
        
        {step === 'LOGIN' ? (
          /* 登录卡片 */
          <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl animate-[slideUp_0.4s_ease-out]">
            <h2 className="text-lg font-bold text-center mb-6 text-white">验证手机号参与</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all text-center text-lg tracking-widest"
                placeholder="请输入手机号"
              />
              {config.participantType === 'PUBLIC' && (
                 <input 
                   type="text" 
                   required
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all text-center text-base"
                   placeholder="您的姓名"
                 />
              )}
              {error && <div className="text-red-300 text-xs text-center bg-red-900/30 py-2 rounded-lg">{error}</div>}
              
              <button type="submit" className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 active:from-yellow-600 active:to-yellow-700 text-red-950 font-bold text-lg rounded-2xl shadow-lg shadow-yellow-900/20 active:scale-[0.98] transition-all">
                立即验证
              </button>
            </form>
          </div>
        ) : (
          /* 抽奖圆盘区域 */
          <div className="flex flex-col items-center w-full">
            
            {/* 用户状态条 */}
            <div className="flex items-center gap-2 bg-black/30 border border-white/5 px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
                <span className="text-yellow-100 text-sm font-medium">{currentUser?.name || currentUser?.phone}</span>
                <span className="w-px h-3 bg-white/20"></span>
                <span className="text-xs text-white/60">机会: <span className="text-white font-bold">{remainingChances}</span></span>
            </div>

            {/* 巨大化按钮 - 视觉重心 */}
            <div className="relative group touch-manipulation">
                {/* 呼吸光环 */}
                <div className={`absolute inset-0 bg-red-500 rounded-full blur-3xl opacity-20 transition-all duration-500 ${isSpinning ? 'scale-150 opacity-40' : 'animate-pulse'}`}></div>
                
                <button 
                    onClick={handleDraw}
                    disabled={isSpinning || remainingChances <= 0}
                    className={`
                        relative w-64 h-64 rounded-full flex flex-col items-center justify-center
                        transition-all duration-200 touch-none select-none
                        ${remainingChances <= 0 
                            ? 'bg-gray-800 grayscale cursor-not-allowed' 
                            : 'bg-gradient-to-b from-red-600 to-red-800 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(255,255,255,0.2)] border-4 border-red-900'
                        }
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    {/* 内部装饰圈 */}
                    <div className={`absolute inset-3 border-2 border-dashed border-yellow-500/30 rounded-full ${isSpinning ? 'animate-[spin_3s_linear_infinite]' : ''}`}></div>
                    
                    <div className="z-10 flex flex-col items-center">
                        {isSpinning ? (
                            <>
                                <Clock className="w-12 h-12 text-yellow-300 mb-2 animate-bounce" />
                                <span className="text-2xl font-bold text-white tracking-widest">{rollingText}</span>
                            </>
                        ) : (
                            <>
                                <Gift className={`w-16 h-16 text-yellow-300 mb-3 filter drop-shadow-lg ${remainingChances > 0 ? 'animate-[bounce_2s_infinite]' : ''}`} />
                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-100 tracking-wider">
                                    {remainingChances > 0 ? "GO" : "结束"}
                                </span>
                                <span className="text-xs text-red-200/60 mt-2 font-medium">点击开始抽奖</span>
                            </>
                        )}
                    </div>
                </button>
            </div>
            
            {/* 底部提示 */}
            <p className="mt-10 text-white/30 text-xs font-light">
                {remainingChances > 0 ? "祝您好运连连" : "感谢您的参与"}
            </p>
          </div>
        )}
      </div>

      {/* --- 底部固定栏 (仅在抽奖模式显示) --- */}
      {step === 'LOTTERY' && (
        <div className="relative z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent flex-shrink-0 flex justify-center">
            <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full text-sm font-medium text-white hover:bg-white/20 transition-all border border-white/5"
            >
                <Trophy className="w-4 h-4 text-yellow-400" />
                查看我的奖品
            </button>
        </div>
      )}

      {/* --- 底部抽屉 (History Drawer) --- */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* 遮罩层 */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s]" 
                onClick={() => setShowHistory(false)}
            ></div>
            
            {/* 抽屉内容 */}
            <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-[2rem] p-6 pb-10 shadow-2xl animate-[slideUp_0.3s_ease-out] border-t border-white/10 max-h-[70vh] flex flex-col">
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>
                
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-400" /> 
                        中奖记录
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="p-2 bg-white/5 rounded-full text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                    {config.drawRecords.filter(r => r.userPhone === currentUser?.phone).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-white/30 space-y-3">
                            <Gift className="w-12 h-12 opacity-20" />
                            <p className="text-sm">暂无中奖记录</p>
                        </div>
                    ) : (
                        config.drawRecords
                            .filter(r => r.userPhone === currentUser?.phone)
                            .slice().reverse() // 最新的在最上面
                            .map(r => (
                            <div key={r.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5">
                                <div>
                                    <div className={`font-bold text-lg ${r.prizeId ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        {r.prizeName}
                                    </div>
                                    <div className="text-xs text-white/40 mt-1">
                                        {new Date(r.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                                {r.prizeId && <Award className="w-6 h-6 text-yellow-500" />}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- 中奖结果弹窗 (Modal) --- */}
      {winResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s]">
            <div className="relative w-full max-w-sm bg-gradient-to-b from-red-600 to-red-900 p-1 rounded-[2.5rem] shadow-2xl animate-[bounceIn_0.6s]">
                
                {/* 顶部爆炸光效 */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[120%] h-full bg-yellow-500/30 blur-3xl rounded-full pointer-events-none"></div>

                <div className="bg-[#1a0505] rounded-[2.3rem] p-8 text-center relative overflow-hidden">
                    {/* 背景纹理 */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:16px_16px]"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-28 h-28 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(234,179,8,0.5)] border-4 border-yellow-200">
                            {winResult.prize ? <Award className="w-14 h-14 text-red-900" /> : <Gift className="w-14 h-14 text-red-900/50" />}
                        </div>
                        
                        <h3 className="text-2xl font-black text-white mb-2 tracking-wide">
                            {winResult.prize ? "🎉 恭喜中奖！" : "😅 遗憾未中"}
                        </h3>
                        <p className="text-yellow-100/80 mb-8 text-sm px-4 leading-relaxed">
                            {winResult.prize ? (
                                <>您获得了 <br/><span className="text-3xl font-black text-yellow-400 mt-2 block">{winResult.prize.name}</span></>
                            ) : "差一点点运气，下次一定行！"}
                        </p>

                        <button 
                            onClick={() => setWinResult(null)}
                            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-red-950 font-black text-lg rounded-2xl shadow-lg transition-transform active:scale-95"
                        >
                            {remainingChances > 0 ? "再抽一次" : "收下祝福"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 隐藏的后台入口 (长按右下角) */}
      <button onClick={onBack} className="absolute bottom-0 right-0 w-12 h-12 opacity-0 z-0"></button>
    </div>
  );
};

export default LotteryView;
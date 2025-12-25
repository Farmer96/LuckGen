import React, { useState, useEffect } from 'react';
import { LotteryConfig, Prize, ParticipantType, User } from '../types';
// 注意：确保这里引用的 services 文件里的 getLotteryData 是支持 async 的版本
// 如果你还在用 mockDatabase，把 await 去掉；如果你用了 client.ts，必须保留 async/await
import { saveLotteryData, getLotteryData, addOrUpdateUser } from '../services/client'; 
import { generateEventDetails } from '../services/geminiService';
import { 
  Plus, Trash2, Wand2, Users, Trophy, Ticket, Save, LogOut, 
  ExternalLink, Download, Upload, LayoutDashboard, 
  Gift, ChevronRight, FileText, QrCode, X, Copy, Check, AlertTriangle
} from 'lucide-react';

interface AdminDashboardProps {
  onLaunch: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLaunch }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'users' | 'records'>('config');
  const [config, setConfig] = useState<LotteryConfig>({
    id: 'lottery-' + Date.now(),
    title: '',
    description: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    participantType: ParticipantType.PRIVATE,
    prizes: [],
    allowedUsers: [],
    drawRecords: [],
    themeColor: '#FF416C'
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [newUser, setNewUser] = useState<User>({ phone: '', name: '', totalChances: 1, usedChances: 0 });
  const [isGenerated, setIsGenerated] = useState(false);
  
  // QR Code Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrHost, setQrHost] = useState(window.location.host); 
  const [copied, setCopied] = useState(false);

  // --- 实时同步逻辑 (修复了 async/await 报错) ---
  useEffect(() => {
    // 修复点：这里必须加上 async
    const loadData = async () => {
      const existing = await getLotteryData();
      if (existing) {
        setConfig(prev => {
            // 如果本地是初始空状态，则完全加载远程数据
            if (prev.id.startsWith('lottery-') && !prev.title) return existing;
            
            // 智能合并：保留本地正在编辑的内容，但同步库存和记录
            const mergedPrizes = prev.prizes.map(localPrize => {
                const remotePrize = existing.prizes.find(p => p.id === localPrize.id);
                return remotePrize 
                    ? { ...localPrize, remainingCount: remotePrize.remainingCount } 
                    : localPrize;
            });

            return {
                ...prev,
                drawRecords: existing.drawRecords,
                allowedUsers: existing.allowedUsers,
                prizes: mergedPrizes
            };
        });
        if (existing.id) setIsGenerated(true);
      }
    };

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  // --- 操作函数 ---
  const handleAiGenerate = async () => {
    if (!config.title) { alert("请先输入活动主题"); return; } 
    setAiLoading(true);
    const result = await generateEventDetails(config.title);
    setConfig(prev => ({ ...prev, title: result.title, description: result.description }));
    setAiLoading(false);
  };

  const addPrize = () => {
    const newPrize: Prize = {
      id: Date.now().toString(),
      level: '新奖项',
      name: '',
      probability: 10,
      description: '',
      totalCount: 1,
      remainingCount: 1
    };
    setConfig(prev => ({ ...prev, prizes: [...prev.prizes, newPrize] }));
  };

  const updatePrize = (index: number, field: keyof Prize, value: any) => {
    const updatedPrizes = [...config.prizes];
    // @ts-ignore
    updatedPrizes[index] = { ...updatedPrizes[index], [field]: value };
    if (field === 'totalCount') {
        updatedPrizes[index].remainingCount = value;
    }
    setConfig(prev => ({ ...prev, prizes: updatedPrizes }));
  };

  const removePrize = (index: number) => {
    const updatedPrizes = config.prizes.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, prizes: updatedPrizes }));
  };

  const handleSaveConfig = () => {
    const totalProb = config.prizes.reduce((sum, p) => sum + Number(p.probability), 0);
    if (totalProb > 100) { alert("总概率不能超过 100%"); return; }
    saveLotteryData(config);
    setIsGenerated(true);
    alert("配置已保存！");
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.phone) return;
    addOrUpdateUser(newUser);
    setNewUser({ phone: '', name: '', totalChances: 1, usedChances: 0 });
  };

  const deleteUser = (phone: string) => {
    const updatedUsers = config.allowedUsers.filter(u => u.phone !== phone);
    const newConfig = { ...config, allowedUsers: updatedUsers };
    setConfig(newConfig);
    saveLotteryData(newConfig);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lottery-config-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedConfig = JSON.parse(e.target?.result as string);
        setConfig(parsedConfig);
        saveLotteryData(parsedConfig);
        setIsGenerated(true);
        alert("配置导入成功！");
      } catch (err) { alert("文件格式错误"); }
    };
    reader.readAsText(file);
  };

  // --- 二维码相关 ---
  const getLotteryUrl = () => {
    const protocol = window.location.protocol;
    return `${protocol}//${qrHost}${window.location.pathname}?mode=lottery`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getLotteryUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = {
      totalUsers: config.allowedUsers.length,
      drawCount: config.drawRecords.length,
      remainingPrizes: config.prizes.reduce((sum, p) => sum + p.remainingCount, 0),
      totalPrizes: config.prizes.reduce((sum, p) => sum + p.totalCount, 0),
  };

  const inputClass = "block w-full rounded-lg border border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm px-3 py-2.5 transition-shadow";
  const labelClass = "block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans text-gray-800">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">LuckGen 控制台</h1>
                <p className="text-[10px] text-gray-400 font-medium">活动管理系统 v1.2</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>导入</span>
                    <input type="file" onChange={handleImportData} className="hidden" accept=".json,.txt"/>
                </label>
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                <button onClick={handleExportData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-all">
                    <Download className="w-3.5 h-3.5" />
                    <span>备份</span>
                </button>
            </div>

            {isGenerated && (
              <button 
                onClick={() => setShowQrModal(true)} 
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-lg transition-all text-sm font-bold"
              >
                <QrCode className="w-4 h-4" />
                分享/二维码
              </button>
            )}

            {isGenerated && (
              <button onClick={onLaunch} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-white px-4 py-2 rounded-lg shadow-md transition-all text-sm font-medium">
                <ExternalLink className="w-4 h-4" />
                打开抽奖页
              </button>
            )}

            <button onClick={() => { if(confirm("确定退出并清空缓存？")) { localStorage.clear(); window.location.reload(); }}} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">奖品库存</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">{stats.remainingPrizes}</span>
                        <span className="text-sm text-gray-400 font-medium">/ {stats.totalPrizes}</span>
                    </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Gift className="w-6 h-6" /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">参与人次</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">{stats.drawCount}</span>
                        <span className="text-sm text-gray-400 font-medium">次</span>
                    </div>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600"><Ticket className="w-6 h-6" /></div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">注册用户</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">{stats.totalUsers}</span>
                        <span className="text-sm text-gray-400 font-medium">人</span>
                    </div>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><Users className="w-6 h-6" /></div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Nav */}
            <nav className="lg:w-64 flex-shrink-0 space-y-2">
                {[
                    { id: 'config', label: '活动配置', icon: Wand2, desc: '基础信息与奖池' },
                    { id: 'users', label: '用户管理', icon: Users, desc: '名单录入' },
                    { id: 'records', label: '中奖明细', icon: FileText, desc: '流水记录' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center p-3 text-left rounded-xl transition-all border ${
                            activeTab === item.id 
                            ? 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-50' 
                            : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'
                        }`}
                    >
                        <div className={`p-2 rounded-lg mr-3 ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className={`text-sm font-bold ${activeTab === item.id ? 'text-gray-900' : 'text-gray-600'}`}>{item.label}</div>
                            <div className="text-xs text-gray-400 font-medium">{item.desc}</div>
                        </div>
                        {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                    </button>
                ))}
            </nav>

            {/* Right Content */}
            <main className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 p-8 min-h-[600px] relative">
                
                {/* === TAB 1: CONFIGURATION === */}
                {activeTab === 'config' && (
                    <div className="space-y-10">
                        {/* 基础信息 */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-8 w-1.5 bg-indigo-500 rounded-full"></div>
                                <h3 className="text-xl font-bold text-gray-900">基础信息</h3>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className={labelClass}>活动主题</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className={inputClass} placeholder="例：2025 公司年会盛典" />
                                        <button onClick={handleAiGenerate} disabled={aiLoading} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg hover:bg-purple-100 font-medium text-sm transition-colors whitespace-nowrap">
                                            <Wand2 className="w-4 h-4" /> AI 润色
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>活动欢迎语</label>
                                    <textarea value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} className={`${inputClass} h-24 resize-none`} placeholder="显示在抽奖首页..." />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div><label className={labelClass}>开始时间</label><input type="datetime-local" value={config.startTime} onChange={(e) => setConfig({ ...config, startTime: e.target.value })} className={inputClass} /></div>
                                    <div><label className={labelClass}>结束时间</label><input type="datetime-local" value={config.endTime} onChange={(e) => setConfig({ ...config, endTime: e.target.value })} className={inputClass} /></div>
                                </div>
                                <div>
                                    <label className={labelClass}>参与模式</label>
                                    <select value={config.participantType} onChange={(e) => setConfig({ ...config, participantType: e.target.value as ParticipantType })} className={inputClass}>
                                        <option value={ParticipantType.PUBLIC}>公开模式 (无需名单，所有人可玩)</option>
                                        <option value={ParticipantType.PRIVATE}>私密模式 (仅限白名单用户)</option>
                                    </select>
                                </div>
                            </div>
                        </section>
                        
                        {/* 保存按钮条 */}
                        <div className="sticky top-0 z-20 bg-indigo-50/80 backdrop-blur-md border border-indigo-100 p-4 rounded-xl flex items-center justify-between shadow-sm my-6">
                            <div className="flex items-center gap-2 text-indigo-900 text-sm">
                                <AlertTriangle className="w-4 h-4 text-indigo-600" />
                                <span>提示：修改完上方信息或下方奖品后，请点击保存。</span>
                            </div>
                            <button 
                                onClick={handleSaveConfig} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 flex items-center gap-2 font-bold shadow-md transition-all active:scale-95"
                            >
                                <Save className="w-4 h-4" />
                                保存配置
                            </button>
                        </div>

                        {/* 奖池配置 */}
                        <section>
                            <div className="flex justify-between items-end mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-1.5 bg-yellow-500 rounded-full"></div>
                                    <h3 className="text-xl font-bold text-gray-900">奖项设置</h3>
                                </div>
                                <button onClick={addPrize} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 font-bold text-sm transition-colors">
                                    <Plus className="w-4 h-4" /> 新增奖项
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {config.prizes.map((prize, idx) => (
                                    <div key={prize.id} className="relative bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                                        <button onClick={() => removePrize(idx)} className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                <div className="md:col-span-3">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">等级</label>
                                                    <input type="text" value={prize.level} onChange={(e) => updatePrize(idx, 'level', e.target.value)} className="w-full border-b border-gray-300 py-1 text-sm font-bold text-indigo-600 focus:border-indigo-500 outline-none bg-transparent" placeholder="特等奖" />
                                                </div>
                                                <div className="md:col-span-9">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">奖品名称</label>
                                                    <input type="text" value={prize.name} onChange={(e) => updatePrize(idx, 'name', e.target.value)} className="w-full bg-gray-50 rounded-lg px-3 py-2 text-base font-bold text-gray-900 border-transparent focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="奖品名称" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">概率%</label><input type="number" value={prize.probability} onChange={(e) => updatePrize(idx, 'probability', Number(e.target.value))} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" /></div>
                                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">数量</label><input type="number" value={prize.totalCount} onChange={(e) => updatePrize(idx, 'totalCount', Number(e.target.value))} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" /></div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase text-right block">库存监控</label>
                                                    <div className="flex items-center gap-2 justify-end mt-1.5">
                                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[80px]">
                                                            <div className={`h-full rounded-full ${prize.remainingCount === 0 ? 'bg-red-400' : 'bg-emerald-500'}`} style={{ width: `${(prize.remainingCount / Math.max(prize.totalCount, 1)) * 100}%` }}></div>
                                                        </div>
                                                        <span className="text-sm font-mono font-bold text-gray-600">{prize.remainingCount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {config.prizes.length === 0 && (
                                    <div onClick={addPrize} className="cursor-pointer border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                                        <Gift className="w-8 h-8 opacity-50 mb-2" />
                                        <p className="font-medium">点击添加第一个奖品</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {/* === TAB 2: USERS === */}
                {activeTab === 'users' && (
                    <div className="space-y-6 animate-[fadeIn_0.3s]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50/80 p-6 rounded-2xl border border-gray-200">
                             <div className="col-span-1"><label className={labelClass}>手机号</label><input type="tel" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} className={inputClass} placeholder="13800..." /></div>
                             <div className="col-span-1"><label className={labelClass}>姓名</label><input type="text" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className={inputClass} placeholder="张三" /></div>
                             <div className="col-span-1"><label className={labelClass}>抽奖次数</label><input type="number" value={newUser.totalChances} onChange={(e) => setNewUser({...newUser, totalChances: Number(e.target.value)})} className={inputClass} /></div>
                             <button onClick={handleAddUser} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-[46px] font-bold shadow-md transition-all active:scale-95">添加用户</button>
                        </div>
                        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50"><tr><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">用户</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">进度</th><th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">操作</th></tr></thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {config.allowedUsers.length === 0 ? (<tr><td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-400">列表为空</td></tr>) : config.allowedUsers.map(u => (
                                        <tr key={u.phone} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.phone} <span className="text-gray-400 font-normal ml-2">{u.name}</span></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm"><span className="inline-block bg-gray-100 rounded px-2 py-1 text-xs font-mono text-gray-600">{u.usedChances} / {u.totalChances}</span></td>
                                            <td className="px-6 py-4 text-right text-sm font-medium"><button onClick={() => deleteUser(u.phone)} className="text-red-400 hover:text-red-600 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">删除</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* === TAB 3: RECORDS === */}
                {activeTab === 'records' && (
                    <div className="animate-[fadeIn_0.3s]">
                         <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="max-h-[600px] overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-10"><tr><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">中奖时间</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">用户</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">奖品内容</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {config.drawRecords.map(r => (
                                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500 font-mono">{new Date(r.timestamp).toLocaleTimeString()}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{r.userPhone}</td>
                                                <td className="px-6 py-4 text-sm">{r.prizeId ? <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">{r.prizeName}</span> : <span className="text-gray-400 italic">未中奖</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">活动二维码</h3>
              <p className="text-xs text-gray-500 mt-1">手机扫码直接参与抽奖</p>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-inner flex justify-center mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getLotteryUrl())}`} 
                alt="Lottery QR Code" 
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="space-y-3">
               <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">域名/IP (局域网必填)</label>
                  <input 
                    type="text" 
                    value={qrHost} 
                    onChange={(e) => setQrHost(e.target.value)} 
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="例如 192.168.1.5:5173"
                  />
                  <p className="text-[10px] text-orange-500 mt-1">* 如果是手机扫码，请将 localhost 改为电脑的局域网 IP</p>
               </div>
               
               <button 
                onClick={copyToClipboard}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
               >
                 {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                 {copied ? "已复制链接" : "复制活动链接"}
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
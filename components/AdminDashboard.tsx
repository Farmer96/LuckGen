import React, { useState, useEffect } from 'react';
import { LotteryConfig, Prize, ParticipantType, User } from '../types';
import { saveLotteryData, getLotteryData, addOrUpdateUser } from '../services/mockDatabase';
import { generateEventDetails } from '../services/geminiService';
import { Plus, Trash2, Wand2, Users, Trophy, Ticket, Save, LogOut, ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    const existing = getLotteryData();
    if (existing) {
      setConfig(existing);
      setIsGenerated(true);
    }
  }, []);

  const handleAiGenerate = async () => {
    if (!config.title && !config.description) return;
    setAiLoading(true);
    const result = await generateEventDetails(config.title || "公司年会");
    setConfig(prev => ({ ...prev, title: result.title, description: result.description }));
    setAiLoading(false);
  };

  const addPrize = () => {
    const newPrize: Prize = {
      id: Date.now().toString(),
      level: '一等奖',
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
    updatedPrizes[index] = { ...updatedPrizes[index], [field]: value };
    
    // Sync remaining count if total count changes (only if not started, simple logic for demo)
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
    // Validation
    const totalProb = config.prizes.reduce((sum, p) => sum + Number(p.probability), 0);
    if (totalProb > 100) {
      alert("总概率不能超过 100%");
      return;
    }
    saveLotteryData(config);
    setIsGenerated(true);
    alert("配置已保存！");
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.phone) return;
    addOrUpdateUser(newUser);
    // Refresh local state
    const updatedData = getLotteryData();
    if (updatedData) setConfig(updatedData);
    setNewUser({ phone: '', name: '', totalChances: 1, usedChances: 0 });
  };

  const deleteUser = (phone: string) => {
    // In a real app we would call service, here we filter local state and save
    const updatedUsers = config.allowedUsers.filter(u => u.phone !== phone);
    const newConfig = { ...config, allowedUsers: updatedUsers };
    setConfig(newConfig);
    saveLotteryData(newConfig);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">抽奖管理后台</h1>
          </div>
          <div className="flex gap-3">
             {isGenerated && (
              <button 
                onClick={onLaunch}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                前往抽奖页
              </button>
            )}
            <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
                <LogOut className="w-4 h-4" />
                重置所有
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('config')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'config' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Trophy className="mr-3 h-5 w-5" />
              活动配置
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="mr-3 h-5 w-5" />
              参与人员 ({config.allowedUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'records' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Ticket className="mr-3 h-5 w-5" />
              中奖记录 ({config.drawRecords.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <main className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          
          {/* TAB: CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">活动主题 / 标题</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={config.title} 
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      placeholder="例如：公司年度晚宴"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button 
                      onClick={handleAiGenerate}
                      disabled={aiLoading}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Wand2 className="h-4 w-4 mr-2 text-purple-500" />
                      {aiLoading ? '思考中...' : 'AI 润色'}
                    </button>
                  </div>

                  <label className="block text-sm font-medium text-gray-700">活动描述</label>
                  <textarea 
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">开始时间</label>
                      <input 
                        type="datetime-local" 
                        value={config.startTime}
                        onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">结束时间</label>
                      <input 
                        type="datetime-local" 
                        value={config.endTime}
                        onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">参与方式</label>
                    <select 
                      value={config.participantType}
                      onChange={(e) => setConfig({ ...config, participantType: e.target.value as ParticipantType })}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value={ParticipantType.PUBLIC}>所有人 (公开)</option>
                      <option value={ParticipantType.PRIVATE}>指定用户 (私密)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {config.participantType === ParticipantType.PUBLIC 
                        ? '任何人只要有链接并输入手机号即可参与。' 
                        : '只有在参与名单中的用户才能抽奖。适用于付费或内部活动。'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">奖项配置</h3>
                  <button onClick={addPrize} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    <Plus className="w-4 h-4" /> 添加奖品
                  </button>
                </div>

                <div className="space-y-3">
                  {config.prizes.map((prize, idx) => (
                    <div key={prize.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-4 items-start md:items-end">
                      <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="col-span-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase">等级</label>
                          <input 
                            type="text" 
                            placeholder="如：一等奖"
                            value={prize.level}
                            onChange={(e) => updatePrize(idx, 'level', e.target.value)}
                            className="w-full text-sm rounded border-gray-300" 
                          />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase">奖品名称</label>
                          <input 
                            type="text" 
                            placeholder="如：iPhone 15"
                            value={prize.name}
                            onChange={(e) => updatePrize(idx, 'name', e.target.value)}
                            className="w-full text-sm rounded border-gray-300" 
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase">概率 (%)</label>
                          <input 
                            type="number" 
                            value={prize.probability}
                            onChange={(e) => updatePrize(idx, 'probability', Number(e.target.value))}
                            className="w-full text-sm rounded border-gray-300" 
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-xs font-semibold text-gray-500 uppercase">数量</label>
                          <input 
                            type="number" 
                            value={prize.totalCount}
                            onChange={(e) => updatePrize(idx, 'totalCount', Number(e.target.value))}
                            className="w-full text-sm rounded border-gray-300" 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => removePrize(idx)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {config.prizes.length === 0 && <p className="text-gray-400 text-sm italic text-center py-4">暂未添加奖品。</p>}
                </div>
              </div>
              
              <div className="pt-6 flex justify-end">
                <button 
                  onClick={handleSaveConfig}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm"
                >
                  <Save className="w-5 h-5" />
                  保存并生成
                </button>
              </div>
            </div>
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <div>
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      即使活动开始后，您也可以动态添加用户。如果开启了“指定用户 (私密)”模式，只有在此列表中的用户才能参与。
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8">
                <h3 className="text-sm font-medium text-gray-900 mb-3">添加参与资格</h3>
                <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">手机号</label>
                    <input 
                      required
                      type="tel" 
                      value={newUser.phone}
                      onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                      placeholder="如：13800138000"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">姓名 (选填)</label>
                    <input 
                      type="text" 
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="张三"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-500 mb-1">抽奖次数</label>
                    <input 
                      type="number" 
                      min="1"
                      value={newUser.totalChances}
                      onChange={(e) => setNewUser({...newUser, totalChances: Number(e.target.value)})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm text-sm font-medium">
                    添加 / 更新
                  </button>
                </form>
              </div>

              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">手机号</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">姓名</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">机会 (已用/总数)</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">删除</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {config.allowedUsers.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400">暂无用户</td></tr>
                    ) : (
                      config.allowedUsers.map((user) => (
                        <tr key={user.phone}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{user.phone}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.name || '-'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className={user.usedChances >= user.totalChances ? "text-red-500 font-bold" : "text-green-600"}>
                              {user.usedChances}
                            </span> / {user.totalChances}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button onClick={() => deleteUser(user.phone)} className="text-red-600 hover:text-red-900">删除</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: RECORDS */}
          {activeTab === 'records' && (
             <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
             <table className="min-w-full divide-y divide-gray-300">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">时间</th>
                   <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">用户</th>
                   <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">奖品</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200 bg-white">
                 {config.drawRecords.length === 0 ? (
                   <tr><td colSpan={3} className="text-center py-8 text-gray-400">暂无抽奖记录</td></tr>
                 ) : (
                   config.drawRecords.map((record) => (
                     <tr key={record.id}>
                       <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500">{new Date(record.timestamp).toLocaleString()}</td>
                       <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{record.userPhone}</td>
                       <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {record.prizeId ? (
                             <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                {record.prizeName}
                             </span>
                        ) : (
                            <span className="text-gray-400">未中奖</span>
                        )}
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
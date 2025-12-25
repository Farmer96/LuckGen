import { LotteryConfig, User, DrawResult, Prize } from '../types';

// ⚠️ 上线时请改为你的服务器地址，例如: https://your-app.zeabur.app
const API_BASE = 'https://farmer96.zeabur.app';

export const getLotteryData = async (): Promise<LotteryConfig | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/data`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("连接服务器失败", e);
    return null;
  }
};

export const saveLotteryData = async (data: LotteryConfig) => {
  try {
    await fetch(`${API_BASE}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    alert("保存失败，请检查网络");
  }
};

export const checkEligibility = async (phone: string, name: string) => {
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name })
    });
    const data = await res.json();
    return { 
        eligible: data.success, 
        message: data.msg || (data.success ? "验证成功" : "验证失败"), 
        user: data.user 
    };
  } catch (e) {
    return { eligible: false, message: "网络错误，无法连接服务器" };
  }
};

export const performDraw = async (phone: string) => {
  try {
    const res = await fetch(`${API_BASE}/api/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (data.error) {
        return { result: null, prize: null, error: data.error };
    }
    return { result: data.result, prize: data.prize };
  } catch (e) {
    return { result: null, prize: null, error: "网络连接断开" };
  }
};

// 兼容旧代码的辅助函数 (AdminDashboard添加用户用)
export const addOrUpdateUser = async (user: User) => {
  // 由于我们现在的保存是全量保存配置，所以只需在前端获取config，修改users数组，然后调用saveLotteryData即可
  // 在 AdminDashboard 里逻辑已经包含了 save，所以这里可以留空，或者为了严谨实现一下:
  const config = await getLotteryData();
  if(!config) return;
  const idx = config.allowedUsers.findIndex(u => u.phone === user.phone);
  if(idx > -1) config.allowedUsers[idx] = user;
  else config.allowedUsers.push(user);
  await saveLotteryData(config);
};
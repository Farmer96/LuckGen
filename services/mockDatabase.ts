import { LotteryConfig, User, DrawResult, Prize, ParticipantType } from '../types';

const STORAGE_KEY = 'luckygen_lottery_data';

export const getLotteryData = (): LotteryConfig | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveLotteryData = (data: LotteryConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const initializeLottery = (config: LotteryConfig) => {
  saveLotteryData(config);
};

export const addOrUpdateUser = (user: User): boolean => {
  const data = getLotteryData();
  if (!data) return false;

  const existingIndex = data.allowedUsers.findIndex(u => u.phone === user.phone);
  if (existingIndex >= 0) {
    // Update existing
    data.allowedUsers[existingIndex] = {
      ...data.allowedUsers[existingIndex],
      name: user.name,
      totalChances: user.totalChances // Update chances (could be additive in real app, here we overwrite for admin simplicity)
    };
  } else {
    // Add new
    data.allowedUsers.push(user);
  }
  
  saveLotteryData(data);
  return true;
};

export const getUser = (phone: string): User | undefined => {
  const data = getLotteryData();
  if (!data) return undefined;
  return data.allowedUsers.find(u => u.phone === phone);
};

export const checkEligibility = (phone: string, name: string): { eligible: boolean; message: string; user?: User } => {
  const data = getLotteryData();
  if (!data) return { eligible: false, message: "系统错误：未找到抽奖活动数据。", user: undefined };

  const now = new Date();
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (now < start) return { eligible: false, message: "活动尚未开始。" };
  if (now > end) return { eligible: false, message: "活动已结束。" };

  // Check user list
  let user = data.allowedUsers.find(u => u.phone === phone);

  if (data.participantType === ParticipantType.PRIVATE) {
    if (!user) {
      return { eligible: false, message: "您不在受邀名单中，请联系管理员。" };
    }
    // Simple name check if provided
    if (name && user.name !== name) {
       return { eligible: false, message: "姓名与注册的手机号不匹配。" };
    }
  } else {
    // PUBLIC MODE: Auto-register if not exists, default 1 chance (or configurable)
    if (!user) {
      user = {
        phone,
        name,
        totalChances: 1, // Default for public
        usedChances: 0
      };
      data.allowedUsers.push(user);
      saveLotteryData(data);
    }
  }

  if (user.usedChances >= user.totalChances) {
    return { eligible: false, message: "您的抽奖次数已用完。", user };
  }

  return { eligible: true, message: "验证成功", user };
};

export const performDraw = (phone: string): { result: DrawResult | null; prize: Prize | null; error?: string } => {
  const data = getLotteryData();
  if (!data) return { result: null, prize: null, error: "无数据" };

  const userIndex = data.allowedUsers.findIndex(u => u.phone === phone);
  if (userIndex === -1) return { result: null, prize: null, error: "用户未找到" };

  const user = data.allowedUsers[userIndex];
  if (user.usedChances >= user.totalChances) return { result: null, prize: null, error: "没有剩余抽奖次数" };

  // Logic: 
  // 1. Filter prizes with remainingCount > 0
  // 2. Calculate random number
  // 3. Determine win
  
  const availablePrizes = data.prizes.filter(p => p.remainingCount > 0);
  
  let random = Math.random() * 100; // 0 to 100
  let cumulativeProbability = 0;
  let wonPrize: Prize | null = null;

  for (const prize of availablePrizes) {
    cumulativeProbability += prize.probability;
    if (random <= cumulativeProbability) {
      wonPrize = prize;
      break;
    }
  }

  // Update Data
  user.usedChances += 1;
  data.allowedUsers[userIndex] = user;

  const result: DrawResult = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    prizeId: wonPrize ? wonPrize.id : null,
    prizeName: wonPrize ? wonPrize.name : "谢谢参与",
    userPhone: phone
  };

  if (wonPrize) {
    const prizeIndex = data.prizes.findIndex(p => p.id === wonPrize!.id);
    if (prizeIndex >= 0) {
      data.prizes[prizeIndex].remainingCount -= 1;
    }
  }

  data.drawRecords.unshift(result); // Add to history
  saveLotteryData(data);

  return { result, prize: wonPrize };
};
// 合约配置
export const CONTRACT_CONFIG = {
  // Monad 测试网配置
  MONAD_TESTNET: {
    chainId: '0x2797', // 10143 的十六进制
    chainName: 'Monad Testnet',
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.testnet.monad.xyz/'],
    blockExplorerUrls: ['https://explorer.testnet.monad.xyz/'],
  },
  
  // 合约地址（部署后更新）
  CONTRACT_ADDRESS: process.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  
  // 合约ABI（部署后更新）
  CONTRACT_ABI: [
    // 事件
    "event WheelSpun(address indexed player, uint256 resultIndex, bool isWin, uint256 timestamp)",
    "event DailyLimitReached(address indexed player, uint256 dailyCount)",
    "event TriplePlayAchieved(address indexed player, uint256 winCount)",
    "event GamePaused(address indexed by)",
    "event GameResumed(address indexed by)",
    "event PrizePoolUpdated(uint256 newAmount)",
    
    // 常量
    "function DAILY_SPIN_LIMIT() view returns (uint256)",
    "function MAX_WINS_IN_7_DAYS() view returns (uint256)",
    "function WINNING_OPTIONS() view returns (uint256)",
    "function WHEEL_OPTIONS() view returns (uint256)",
    
    // 状态变量
    "function prizePool() view returns (uint256)",
    "function spinFee() view returns (uint256)",
    "function nonce() view returns (uint256)",
    
    // 主要函数
    "function spinWheel(uint256 playerChoice) payable",
    "function checkDailyLimit(address player) view returns (bool)",
    "function checkSevenDayLimit(address player) view returns (bool)",
    "function getPlayerRecord(address player) view returns (uint256 totalSpins, uint256 totalWins, uint256 consecutiveWins, uint256 dailySpinCount, uint256 lastSpinDate, uint256[] memory winHistory, bool isActive)",
    "function getRecentWins(address player) view returns (uint256)",
    "function getContractInfo() view returns (uint256 _prizePool, uint256 _spinFee, uint256 _nonce, bool _paused)",
    
    // 管理员函数
    "function registerPlayer(address player)",
    "function pauseGame()",
    "function resumeGame()",
    "function setSpinFee(uint256 newFee)",
    "function updatePrizePool(uint256 newAmount)",
    "function blacklistPlayer(address player)",
    "function unblacklistPlayer(address player)",
    "function withdrawBalance()",
    "function emergencyStop()",
    
    // 接收ETH
    "receive() external payable",
  ],
  
  // 游戏配置
  GAME_CONFIG: {
    DAILY_SPIN_LIMIT: 1,
    MAX_WINS_IN_7_DAYS: 3,
    WINNING_OPTIONS: 6,
    WHEEL_OPTIONS: 20,
    DEFAULT_SPIN_FEE: '0.001', // 0.001 MON
  },
  
  // 奖励配置
  REWARDS: {
    0: { name: 'Chosen one?', reward: '0.01', emoji: '👑' },
    1: { name: 'Chain blast', reward: '0.005', emoji: '💥' },
    2: { name: 'Free mint today', reward: '0.008', emoji: '🎁' },
    3: { name: 'Gas good', reward: '0.003', emoji: '⛽' },
    4: { name: 'Max active', reward: '0.006', emoji: '📈' },
    5: { name: 'Snap lock', reward: '0.004', emoji: '🔒' },
  },
};

// 网络配置
export const NETWORK_CONFIG = {
  MONAD_TESTNET: {
    chainId: '0x2797',
    chainName: 'Monad Testnet',
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.testnet.monad.xyz/'],
    blockExplorerUrls: ['https://explorer.testnet.monad.xyz/'],
  },
};

// 合约实例创建函数
export const createContractInstance = (provider, address = null) => {
  if (!provider) {
    console.error('Provider is required');
    return null;
  }
  
  const contractAddress = address || CONTRACT_CONFIG.CONTRACT_ADDRESS;
  
  if (contractAddress === '0x0000000000000000000000000000000000000000') {
    console.error('Contract address not set');
    return null;
  }
  
  try {
    const ethers = require('ethers');
    return new ethers.Contract(
      contractAddress,
      CONTRACT_CONFIG.CONTRACT_ABI,
      provider
    );
  } catch (error) {
    console.error('Failed to create contract instance:', error);
    return null;
  }
};

// 格式化奖励金额
export const formatReward = (reward) => {
  return `${reward} MON`;
};

// 获取奖励信息
export const getRewardInfo = (resultIndex) => {
  return CONTRACT_CONFIG.REWARDS[resultIndex] || {
    name: 'Unknown',
    reward: '0',
    emoji: '❓'
  };
}; 
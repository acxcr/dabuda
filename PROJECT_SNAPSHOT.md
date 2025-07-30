# Magic Wheel DApp - 项目快照文档

> **版本**: v1.0  
> **更新时间**: 2024年1月  
> **目的**: 为新会话提供完整的项目上下文，减少重复沟通成本

---

## 📋 项目概述

**Magic Wheel DApp** 是一个基于区块链的魔法转盘应用，主题为"今天打不打？"。这是一个**几乎全链上**的DApp，转盘结果由前端生成并发送到链上验证和记录。

### 核心特性
- ✅ 前端生成随机结果，链上验证和记录
- ✅ 严格的每日和7天滚动窗口限制
- ✅ 高效的历史查询（O(1)复杂度）
- ✅ 测试友好的时间缩放机制
- ✅ 无奖励机制，纯结果记录

---

## 🏗️ 技术架构

### 技术栈
- **前端**: React 18.3.1 + Vite 6.3.5 + TailwindCSS 4.1.11
- **Web3**: Ethers.js (通过CDN导入)
- **智能合约**: Solidity ^0.8.19 + Hardhat + OpenZeppelin
- **开发网络**: Hardhat Local (Chain ID: 0x7A69)
- **生产网络**: Monad Testnet (Chain ID: 0x2797)

### 项目结构
```
magic-wheel-dapp/
├── contracts/
│   └── MagicWheel.sol                 # 核心智能合约
├── scripts/
│   ├── deploy.js                      # 主部署脚本
│   └── deploy-fresh.cjs               # 清洁部署脚本
├── src/
│   ├── components/                    # React组件库
│   │   ├── ui/button.jsx             # UI组件
│   │   ├── WalletConnect.jsx         # 钱包连接组件
│   │   ├── NetworkModal.jsx          # 网络切换模态框
│   │   ├── TransactionStatus.jsx     # 交易状态显示
│   │   └── SevenDayLimitModal.jsx    # 7天限制提醒
│   ├── hooks/
│   │   └── useWeb3.js                # Web3交互核心逻辑
│   ├── config/
│   │   ├── contract.js               # 合约配置和ABI
│   │   └── localTest.js              # 本地存储管理
│   ├── App.jsx                       # 主应用组件
│   ├── App.css                       # 样式文件
│   └── main.jsx                      # 应用入口
├── public/                           # 静态资源
├── *.cjs                            # 测试和调试脚本
├── hardhat.config.js                # Hardhat配置
├── package.json                     # 项目依赖
└── PROJECT_SNAPSHOT.md              # 本文档
```

---

## 🎯 功能规格详述

### 1. 转盘结果分配机制
```javascript
// 结果映射逻辑
const TOTAL_OPTIONS = 20;      // 总选项数 (0-19)
const WINNING_OPTIONS = 6;     // "打"选项数 (0-5)
const LOSING_OPTIONS = 14;     // "不打"选项数 (6-19)

// 判断逻辑
const isWin = (resultIndex) => resultIndex >= 0 && resultIndex <= 5;
```

### 2. 时间限制机制

#### 每日限制
- **限制**: 每天1次转盘
- **重置时间**: UTC 14:00 (北京时间22:00)
- **实现**: 基于区块时间戳计算当前"日期"
- **测试模式**: 10秒 = 1天

```solidity
// 每日限制检查逻辑
function checkDailyLimit(address player) public view returns (bool) {
    uint256 currentDay = getCurrentDay();
    PlayerRecord memory record = playerRecords[player];
    
    if (record.lastSpinDate == currentDay) {
        return record.dailySpinCount < DAILY_SPIN_LIMIT;
    }
    return true;
}
```

#### 7天滚动窗口限制
- **触发条件**: 7天内累计3次"打"结果
- **计算逻辑**: 从当前时间回推8天（不含当天）
- **行为**: 前端弹窗提醒，合约不强制阻止
- **重置**: 自动滚动，超过7天的记录不计入

```solidity
// 7天限制计算逻辑  
function getRecentWins(address player, uint256 currentTime) public view returns (uint256) {
    PlayerRecord memory record = playerRecords[player];
    uint256 cutoffTime = currentTime - (7 * (IS_TEST_MODE ? TEST_TIME_SCALE : 86400));
    
    if (record.lastUpdateTime >= cutoffTime) {
        return record.recentWinCount;
    }
    return 0;
}
```

### 3. 费用机制
- **转盘费用**: 0.00001 MON (固定不可调)
- **费用去向**: 直接转账给合约拥有者
- **支付时机**: 转盘交易时一次性支付
- **无奖池**: 不涉及任何奖励分配机制

### 4. 用户激活机制
- **自动激活**: 用户首次转盘时自动激活
- **无需预注册**: 连接钱包即可直接使用
- **状态初始化**: 首次调用时创建用户记录

---

## 📊 智能合约详解

### 核心常量
```solidity
contract MagicWheel {
    // 基础限制
    uint256 public constant DAILY_SPIN_LIMIT = 1;
    uint256 public constant MAX_WINS_IN_7_DAYS = 3;
    uint256 public constant WINNING_OPTIONS = 6;
    uint256 public constant WHEEL_OPTIONS = 20;
    
    // 测试模式配置
    bool public constant IS_TEST_MODE = true;
    uint256 public constant TEST_TIME_SCALE = 10; // 10秒 = 1天
    
    // 经济参数
    uint256 public spinFee = 0.00001 ether;
}
```

### PlayerRecord 数据结构
```solidity
struct PlayerRecord {
    uint256 totalSpins;      // 总转盘次数
    uint256 totalWins;       // 总"打"次数
    uint256 dailySpinCount;  // 当日转盘次数
    uint256 lastSpinDate;    // 最后转盘日期（天数）
    uint256 recentWinCount;  // 最近7天"打"次数
    uint256 lastUpdateTime;  // 最后更新时间（时间戳）
    bool isActive;           // 用户是否激活
}
```

### 核心函数说明

#### `spinWheel(uint256 playerChoice)`
- **功能**: 执行转盘操作
- **参数**: playerChoice (0-19, 前端生成的结果)
- **检查**: 每日限制、费用支付、暂停状态
- **更新**: 用户记录、历史数据、7天计数器
- **事件**: 发出 WheelSpun 事件

#### `getPlayerRecord(address player)`
- **功能**: 获取用户完整记录
- **返回**: PlayerRecord 结构体
- **用途**: 前端状态同步和历史显示

#### `getUserSpinHistory(address player, uint256 limit)`  
- **功能**: 获取用户转盘历史
- **返回**: SpinRecord 数组
- **优化**: 支持分页查询，避免gas过高

### 事件定义
```solidity
event WheelSpun(address indexed player, uint256 resultIndex, bool isWin, uint256 timestamp);
event DailyLimitReached(address indexed player, uint256 dailyCount);
event TriplePlayAchieved(address indexed player, uint256 winCount);
```

---

## 🌐 前端架构详解

### 核心 Hooks

#### `useWeb3` - Web3连接管理
```javascript
const {
    account,           // 当前连接账户
    isConnected,       // 连接状态
    isConnecting,      // 连接中状态
    provider,          // Ethers Provider
    chainId,           // 当前网络ID
    connectWallet,     // 连接钱包函数
    disconnect,        // 断开连接函数
    checkMonadNetwork, // 网络检查函数
    switchToHardhat,   // 切换到Hardhat网络
    playGameWithResult // 执行转盘交易
} = useWeb3();
```

#### `useContract` - 合约交互管理
```javascript  
const {
    userRecord,        // 用户链上记录
    hasThreeWins,      // 是否达到7天限制
    isLoading,         // 数据加载状态
    refreshUserData    // 刷新用户数据
} = useContract(account, isConnected);
```

### 状态管理策略

#### 本地状态
```javascript
const [isSpinning, setIsSpinning] = useState(false);           // 转盘动画状态
const [rotation, setRotation] = useState(0);                   // 转盘旋转角度
const [result, setResult] = useState(null);                    // 当前转盘结果
const [showResult, setShowResult] = useState(false);           // 结果显示状态
const [history, setHistory] = useState([]);                    // 历史记录
const [resultIndex, setResultIndex] = useState(null);          // 结果索引
const [wheelDisabled, setWheelDisabled] = useState(false);     // 转盘禁用状态
```

#### 状态持久化逻辑
```javascript
// 页面刷新时恢复状态
useEffect(() => {
    if (userRecord) {
        // 从链上数据恢复历史记录
        const chainHistory = userRecord.winHistory || [];
        setHistory(chainHistory);
        
        // 恢复当前结果和状态
        if (userRecord.lastResult !== undefined) {
            setResultIndex(userRecord.lastResult);
            setResult(getRewardInfo(userRecord.lastResult));
        }
        
        // 恢复按钮状态
        const canSpin = checkCanSpin(userRecord);
        setWheelDisabled(!canSpin);
    }
}, [userRecord]);
```

### 网络管理

#### 支持的网络
```javascript
const NETWORK_CONFIG = {
    SUPPORTED_CHAIN_IDS: ['0x7A69', '0x7a69', '0x2797'],
    NETWORKS: {
        HARDHAT_LOCAL: {
            chainId: '0x7A69',
            chainName: 'Hardhat Local',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['http://127.0.0.1:8545'],
            blockExplorerUrls: ['http://localhost:8545']
        },
        MONAD_TESTNET: {
            chainId: '0x2797',
            chainName: 'Monad Testnet',
            nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
            rpcUrls: ['https://rpc.testnet.monad.xyz/'],
            blockExplorerUrls: ['https://explorer.testnet.monad.xyz/']
        }
    }
};
```

#### 网络检测逻辑
```javascript
const checkMonadNetwork = async () => {
    const currentChainId = await provider.send('eth_chainId', []);
    
    // 大小写不敏感比较
    if (currentChainId.toLowerCase() === '0x7a69') {
        return { isSupported: true, action: 'none' };
    } else if (SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
        return { isSupported: true, action: 'switch' };
    } else {
        return { isSupported: false, action: 'add' };
    }
};
```

---

## 🔧 开发和测试指南

### 本地开发环境设置

#### 1. 启动 Hardhat 节点
```bash
# 在一个终端中启动
npx hardhat node

# 输出示例:
# Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
# Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
```

#### 2. 部署智能合约
```bash
# 使用清洁部署脚本（推荐）
node deploy-fresh.cjs

# 输出示例:
# 🚀 部署干净的合约...
# ✅ 合约地址: 0x5FbDB2315678afecb367f032d93F642f64180aa3
# 💰 spinFee: 0.00001
# 👑 owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

#### 3. 更新前端配置
```javascript
// 更新 src/config/contract.js
export const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // 使用部署输出的地址
```

#### 4. 启动前端服务
```bash
npm run dev

# 访问: http://localhost:5173
```

### 测试脚本工具箱

#### `test-magicwheel-abi.cjs` - ABI和基本功能测试
```bash
node test-magicwheel-abi.cjs

# 测试内容:
# - 合约基本函数调用
# - ABI兼容性验证
# - 用户记录查询
```

#### `test-time-logic.cjs` - 时间逻辑测试
```bash
node test-time-logic.cjs

# 测试内容:
# - 当前区块时间获取
# - 测试模式时间缩放
# - 每日限制计算
# - 7天窗口逻辑
```

#### `test-spin.cjs` - 转盘功能测试
```bash
node test-spin.cjs

# 测试内容:
# - 转盘交易执行
# - 用户记录更新
# - 费用支付验证
# - 状态变化确认
```

#### `check-contract-status.cjs` - 合约状态检查
```bash
node check-contract-status.cjs

# 检查内容:
# - 合约部署状态
# - 代码存在性验证
# - 基本函数可用性
# - 常量值确认
```

### 调试指南

#### 常见问题诊断流程
1. **检查 Hardhat 节点状态**
   ```bash
   # 确认节点运行在 8545 端口
   curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
   ```

2. **验证合约部署**
   ```bash
   node check-contract-status.cjs
   ```

3. **确认前端配置同步**
   - 检查 `CONTRACT_ADDRESS` 是否匹配
   - 确认 `CONTRACT_ABI` 是否为最新

4. **测试基本交互**
   ```bash
   node test-magicwheel-abi.cjs
   ```

---

## 🛠️ 已知问题与解决方案

### 1. ✅ 合约地址同步问题
**问题描述**: 前端合约地址与实际部署地址不匹配  
**错误信息**: `could not decode result data (value="0x", info={ "method": "owner", "signature": "owner()" }, code=BAD_DATA)`  
**解决方案**: 
- 每次部署后立即更新 `src/config/contract.js` 中的 `CONTRACT_ADDRESS`
- 使用 `deploy-fresh.cjs` 获取准确的部署地址
- 部署后运行 `test-magicwheel-abi.cjs` 验证连接

### 2. ✅ ABI不匹配问题  
**问题描述**: 前端ABI与合约实际ABI不一致  
**错误信息**: `spinFee is not a function` 或解码错误  
**解决方案**:
- 使用 `artifacts/contracts/MagicWheel.sol/MagicWheel.json` 中的完整ABI
- 避免手动定义ABI，直接导入编译产物
- 确保合约重新编译后更新ABI

### 3. ✅ 网络检测逻辑问题
**问题描述**: 大小写敏感的Chain ID比较导致误判  
**错误信息**: `当前在 未知网络 (0x7a69) 上，请切换到 Hardhat Local (Chain ID: 0x7A69)`  
**解决方案**:
- 网络ID比较时使用 `toLowerCase()` 统一格式
- 支持 `0x7A69` 和 `0x7a69` 两种格式
- 完善网络切换提示逻辑

### 4. ✅ 状态持久化问题
**问题描述**: 页面刷新后状态丢失，按钮失效  
**表现**: 转盘后刷新页面，按钮变为数字但不可用，历史记录空白  
**解决方案**:
- 基于 `userRecord` 链上数据恢复前端状态
- 在 `useEffect` 中正确设置状态依赖
- 移除 `wheelAnimationCompleted` 对按钮状态的影响

### 5. ✅ ES模块导入问题
**问题描述**: 前端使用 `require()` 导致运行时错误  
**错误信息**: `require is not defined`  
**解决方案**:
- 前端使用 `await import('ethers')` 替代 `require('ethers')`
- 测试脚本使用 `.cjs` 扩展名支持 CommonJS
- 区分前端模块和Node.js脚本的导入方式

### 6. ⚠️ 时间重置验证 (需关注)
**问题描述**: 10秒周期到了不重置，按钮一直不可用  
**当前状态**: 合约支持测试模式，前端逻辑需验证  
**解决方案**:
- 确认前端正确读取合约的测试模式时间
- 验证 `checkDailyLimit` 在时间重置后返回 true
- 测试页面刷新后状态恢复的完整性

### 7. ⚠️ 跨网络交易防护 (需关注)
**问题描述**: 在非目标网络也能发起交易  
**风险**: 可能导致交易失败或发送到错误网络  
**解决方案**:
- 在 `playGameWithResult` 中添加严格的网络检查
- 交易前强制验证当前网络为 Hardhat Local
- 错误网络时阻止交易并提示切换

---

## 🚨 重要注意事项

### 用户体验要求 [[memory:4589678]] [[memory:4589674]]
- **避免游戏化术语**: 不使用"奖励"、"成就"等词汇，改用"结果分配逻辑"
- **避免"获胜"表述**: 用"打"替代"获胜"，用"不打"替代"失败"  
- **简洁明了**: 界面文案保持简洁，避免复杂说明

### 技术原则 [[memory:4589666]]
- **Gas效率优先**: 避免数组遍历，使用状态变量实现O(1)查询
- **安全性考虑**: 防重入攻击、权限控制、暂停机制
- **测试友好**: 支持时间缩放，便于快速验证逻辑

### 开发习惯 [[memory:4603720]]
- **不自动启动服务**: 避免自动启动端口5173或5174的开发服务器
- **用户手动控制**: 让用户决定何时启动前端服务
- **清晰提示**: 提供明确的启动指令

---

## 📝 下一步优先任务

### 高优先级
1. **验证10秒时间重置逻辑**
   - 测试每日限制在10秒后是否正确重置
   - 确认前端按钮状态同步更新
   - 验证页面刷新后状态恢复

2. **完善跨网络交易防护**
   - 在交易前添加强制网络检查
   - 确保只在Hardhat Local执行转盘交易
   - 完善错误提示和网络切换流程

3. **状态一致性验证**
   - 测试各种场景下的状态恢复
   - 确保链上数据与前端状态同步
   - 验证历史记录显示的准确性

### 中优先级
4. **Gas优化测试**
   - 测试大量历史记录下的查询性能
   - 验证分页查询功能
   - 监控合约函数的Gas消耗

5. **边界条件测试**
   - 测试7天限制的边界情况
   - 验证时间跨度的准确计算
   - 测试连续快速交易的处理

### 低优先级
6. **用户体验优化**
   - 完善Loading状态显示
   - 优化交易等待体验
   - 改进错误信息展示

---

## 🔗 快速参考

### 合约地址模板
```javascript
// 本地开发常用地址（仅供参考，实际以部署输出为准）
const COMMON_ADDRESSES = {
    FIRST_DEPLOYMENT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    RESET_DEPLOYMENT: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    // 实际使用时请以 deploy-fresh.cjs 输出为准
};
```

### 关键命令速查
```bash
# 环境准备
npx hardhat node                    # 启动本地节点
node deploy-fresh.cjs              # 部署新合约
npm run dev                        # 启动前端

# 测试验证  
node test-magicwheel-abi.cjs      # 基本功能测试
node test-time-logic.cjs          # 时间逻辑测试
node test-spin.cjs                # 转盘功能测试
node check-contract-status.cjs    # 状态检查

# 调试工具
node check-contract-constants.cjs # 常量检查
```

### 故障诊断清单
- [ ] Hardhat节点是否运行在8545端口？
- [ ] 合约地址是否正确更新到前端？  
- [ ] ABI是否为最新编译版本？
- [ ] 钱包是否连接到正确网络？
- [ ] 账户是否有足够的ETH支付Gas？
- [ ] 测试脚本是否能正常调用合约？

---

**文档维护**: 每次重大更新时请同步更新此文档，确保信息准确性和时效性。
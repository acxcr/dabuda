// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title MagicWheel
 * @dev 魔法转盘游戏智能合约
 * @author Magic Wheel Team
 */
contract MagicWheel is Ownable, ReentrancyGuard, Pausable {
    
    // 事件定义
    event WheelSpun(address indexed player, uint256 resultIndex, bool isWin, uint256 timestamp);
    event DailyLimitReached(address indexed player, uint256 dailyCount);
    event TriplePlayAchieved(address indexed player, uint256 winCount);
    event GamePaused(address indexed by);
    event GameResumed(address indexed by);
    event PrizePoolUpdated(uint256 newAmount);
    
    // 常量定义
    uint256 public constant DAILY_SPIN_LIMIT = 1; // 每日转盘次数限制
    uint256 public constant MAX_WINS_IN_7_DAYS = 3; // 7天内最大获胜次数
    uint256 public constant WINNING_OPTIONS = 6; // 前6个是获胜选项
    uint256 public constant WHEEL_OPTIONS = 20; // 转盘总选项数
    
    // 状态变量
    uint256 public prizePool; // 奖池金额
    uint256 public spinFee = 0.001 ether; // 转盘费用
    uint256 public nonce; // 随机数种子
    
    // 玩家记录结构
    struct PlayerRecord {
        uint256 totalSpins; // 总转盘次数
        uint256 totalWins; // 总获胜次数
        uint256 consecutiveWins; // 连续获胜次数
        uint256 dailySpinCount; // 今日转盘次数
        uint256 lastSpinDate; // 最后转盘日期
        uint256[] winHistory; // 获胜历史时间戳
        bool isActive; // 是否活跃
    }
    
    // 映射
    mapping(address => PlayerRecord) public playerRecords;
    mapping(address => bool) public blacklistedPlayers;
    
    // 修饰符
    modifier onlyActivePlayer() {
        require(playerRecords[msg.sender].isActive, "Player not active");
        _;
    }
    
    modifier notBlacklisted() {
        require(!blacklistedPlayers[msg.sender], "Player is blacklisted");
        _;
    }
    
    modifier validSpinFee() {
        require(msg.value >= spinFee, "Insufficient spin fee");
        _;
    }
    
    // 构造函数
    constructor() Ownable(msg.sender) {
        prizePool = 0;
        nonce = 0;
    }
    
    /**
     * @dev 转盘游戏主函数
     * @param playerChoice 玩家选择的选项（可选，用于验证）
     */
    function spinWheel(uint256 playerChoice) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        onlyActivePlayer 
        notBlacklisted 
        validSpinFee 
    {
        address player = msg.sender;
        PlayerRecord storage record = playerRecords[player];
        
        // 检查每日限制
        require(checkDailyLimit(player), "Daily spin limit reached");
        
        // 检查7天限制
        require(!checkSevenDayLimit(player), "Seven day win limit reached");
        
        // 更新每日计数
        updateDailyCount(player);
        
        // 生成随机结果
        uint256 resultIndex = generateRandomResult(player);
        
        // 判断是否获胜
        bool isWin = resultIndex < WINNING_OPTIONS;
        
        // 更新玩家记录
        updatePlayerRecord(player, resultIndex, isWin);
        
        // 更新奖池
        prizePool += spinFee;
        
        // 增加随机数种子
        nonce++;
        
        // 发出事件
        emit WheelSpun(player, resultIndex, isWin, block.timestamp);
        
        // 如果获胜，处理奖励
        if (isWin) {
            handleWinReward(player, resultIndex);
        }
    }
    
    /**
     * @dev 检查每日限制
     */
    function checkDailyLimit(address player) public view returns (bool) {
        PlayerRecord storage record = playerRecords[player];
        uint256 today = block.timestamp / 1 days;
        
        if (record.lastSpinDate != today) {
            return true; // 新的一天，可以转盘
        }
        
        return record.dailySpinCount < DAILY_SPIN_LIMIT;
    }
    
    /**
     * @dev 检查7天限制
     */
    function checkSevenDayLimit(address player) public view returns (bool) {
        PlayerRecord storage record = playerRecords[player];
        uint256 sevenDaysAgo = block.timestamp - (7 * 24 * 60 * 60);
        uint256 recentWins = 0;
        
        for (uint256 i = 0; i < record.winHistory.length; i++) {
            if (record.winHistory[i] > sevenDaysAgo) {
                recentWins++;
            }
        }
        
        return recentWins >= MAX_WINS_IN_7_DAYS;
    }
    
    /**
     * @dev 更新每日计数
     */
    function updateDailyCount(address player) internal {
        PlayerRecord storage record = playerRecords[player];
        uint256 today = block.timestamp / 1 days;
        
        if (record.lastSpinDate != today) {
            record.dailySpinCount = 0;
            record.lastSpinDate = today;
        }
        
        record.dailySpinCount++;
        record.totalSpins++;
    }
    
    /**
     * @dev 生成随机结果
     */
    function generateRandomResult(address player) internal view returns (uint256) {
        bytes32 hash = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            player,
            nonce
        ));
        
        return uint256(hash) % WHEEL_OPTIONS;
    }
    
    /**
     * @dev 更新玩家记录
     */
    function updatePlayerRecord(address player, uint256 resultIndex, bool isWin) internal {
        PlayerRecord storage record = playerRecords[player];
        
        if (isWin) {
            record.totalWins++;
            record.consecutiveWins++;
            record.winHistory.push(block.timestamp);
            
            // 检查7天限制
            if (checkSevenDayLimit(player)) {
                emit TriplePlayAchieved(player, record.totalWins);
            }
        } else {
            record.consecutiveWins = 0;
        }
    }
    
    /**
     * @dev 处理获胜奖励
     */
    function handleWinReward(address player, uint256 resultIndex) internal {
        // 根据不同的获胜选项给予不同的奖励
        uint256 reward = calculateReward(resultIndex);
        
        if (reward > 0 && address(this).balance >= reward) {
            (bool success, ) = player.call{value: reward}("");
            require(success, "Reward transfer failed");
            prizePool -= reward;
        }
    }
    
    /**
     * @dev 计算奖励金额
     */
    function calculateReward(uint256 resultIndex) internal pure returns (uint256) {
        // 根据获胜选项返回不同的奖励
        if (resultIndex == 0) return 0.01 ether; // "Chosen one?"
        if (resultIndex == 1) return 0.005 ether; // "Chain blast"
        if (resultIndex == 2) return 0.008 ether; // "Free mint today"
        if (resultIndex == 3) return 0.003 ether; // "Gas good"
        if (resultIndex == 4) return 0.006 ether; // "Max active"
        if (resultIndex == 5) return 0.004 ether; // "Snap lock"
        
        return 0;
    }
    
    /**
     * @dev 注册新玩家
     */
    function registerPlayer(address player) external onlyOwner {
        require(!playerRecords[player].isActive, "Player already registered");
        
        playerRecords[player] = PlayerRecord({
            totalSpins: 0,
            totalWins: 0,
            consecutiveWins: 0,
            dailySpinCount: 0,
            lastSpinDate: 0,
            winHistory: new uint256[](0),
            isActive: true
        });
    }
    
    /**
     * @dev 获取玩家记录
     */
    function getPlayerRecord(address player) external view returns (
        uint256 totalSpins,
        uint256 totalWins,
        uint256 consecutiveWins,
        uint256 dailySpinCount,
        uint256 lastSpinDate,
        uint256[] memory winHistory,
        bool isActive
    ) {
        PlayerRecord storage record = playerRecords[player];
        return (
            record.totalSpins,
            record.totalWins,
            record.consecutiveWins,
            record.dailySpinCount,
            record.lastSpinDate,
            record.winHistory,
            record.isActive
        );
    }
    
    /**
     * @dev 获取玩家7天内获胜次数
     */
    function getRecentWins(address player) external view returns (uint256) {
        PlayerRecord storage record = playerRecords[player];
        uint256 sevenDaysAgo = block.timestamp - (7 * 24 * 60 * 60);
        uint256 recentWins = 0;
        
        for (uint256 i = 0; i < record.winHistory.length; i++) {
            if (record.winHistory[i] > sevenDaysAgo) {
                recentWins++;
            }
        }
        
        return recentWins;
    }
    
    // 管理员功能
    
    /**
     * @dev 暂停游戏
     */
    function pauseGame() external onlyOwner {
        _pause();
        emit GamePaused(msg.sender);
    }
    
    /**
     * @dev 恢复游戏
     */
    function resumeGame() external onlyOwner {
        _unpause();
        emit GameResumed(msg.sender);
    }
    
    /**
     * @dev 设置转盘费用
     */
    function setSpinFee(uint256 newFee) external onlyOwner {
        spinFee = newFee;
    }
    
    /**
     * @dev 更新奖池
     */
    function updatePrizePool(uint256 newAmount) external onlyOwner {
        prizePool = newAmount;
        emit PrizePoolUpdated(newAmount);
    }
    
    /**
     * @dev 拉黑玩家
     */
    function blacklistPlayer(address player) external onlyOwner {
        blacklistedPlayers[player] = true;
        playerRecords[player].isActive = false;
    }
    
    /**
     * @dev 解除玩家黑名单
     */
    function unblacklistPlayer(address player) external onlyOwner {
        blacklistedPlayers[player] = false;
        playerRecords[player].isActive = true;
    }
    
    /**
     * @dev 提取合约余额
     */
    function withdrawBalance() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev 获取合约信息
     */
    function getContractInfo() external view returns (
        uint256 _prizePool,
        uint256 _spinFee,
        uint256 _nonce,
        bool _paused
    ) {
        return (prizePool, spinFee, nonce, paused());
    }
    
    // 接收ETH
    receive() external payable {
        prizePool += msg.value;
    }
    
    // 紧急停止
    function emergencyStop() external onlyOwner {
        _pause();
        emit GamePaused(msg.sender);
    }
} 
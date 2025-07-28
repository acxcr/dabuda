// 本地测试配置
export const LOCAL_TEST_CONFIG = {
  // 游戏规则
  DAILY_SPIN_LIMIT: 1, // 每日转盘次数限制
  MAX_WINS_IN_7_DAYS: 3, // 7天内最大获胜次数
  RESTRICTION_DAYS: 7, // 限制期天数
}

// 本地存储工具类
export class LocalStorage {
  constructor() {
    this.storageKey = 'magic_wheel_test_data'
  }

  // 获取所有测试数据
  getAllData() {
    const data = localStorage.getItem(this.storageKey)
    const parsedData = data ? JSON.parse(data) : {}
    console.log('🔍 LocalStorage.getAllData:', { storageKey: this.storageKey, rawData: data, parsedData })
    return parsedData
  }

  // 保存所有测试数据
  saveAllData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  // 获取用户记录
  getUserRecord(address) {
    const data = this.getAllData()
    const record = data[address] || null
    console.log('🔍 LocalStorage.getUserRecord:', { address, data, record })
    return record
  }

  // 更新游戏记录
  updateGameRecord(address, resultIndex) {
    const data = this.getAllData()
    const now = Date.now()
    const today = new Date(now).toDateString()
    
    let record = data[address] || {
      totalSpins: 0,
      totalWins: 0,
      consecutiveWins: 0,
      dailySpinCount: 0,
      lastSpinDate: null,
      winHistory: [],
      restrictionStartTime: null
    }

    // 检查是否是新的日期
    if (record.lastSpinDate !== today) {
      record.dailySpinCount = 0
      record.lastSpinDate = today
    }

    // 更新转盘次数
    record.dailySpinCount++
    record.totalSpins++

    // 检查是否获胜
    const isWin = resultIndex < 6 // 前6个是获胜选项
    if (isWin) {
      record.totalWins++
      record.consecutiveWins++
      record.winHistory.push({
        date: today,
        resultIndex,
        timestamp: now
      })
    } else {
      record.consecutiveWins = 0
    }

    // 检查7天限制 - 只记录winHistory，不设置restrictionStartTime
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
    const recentWins = record.winHistory.filter(win => win.timestamp > sevenDaysAgo)
    
    // 移除限制期逻辑，只保留7天获胜记录用于弹窗提示
    // if (recentWins.length >= LOCAL_TEST_CONFIG.MAX_WINS_IN_7_DAYS) {
    //   record.restrictionStartTime = now
    // }

    data[address] = record
    this.saveAllData(data)
    return record
  }

  // 检查每日限制
  checkDailyLimit(address) {
    const record = this.getUserRecord(address)
    if (!record) return true
    
    const today = new Date().toDateString()
    if (record.lastSpinDate !== today) return true
    
    return record.dailySpinCount < LOCAL_TEST_CONFIG.DAILY_SPIN_LIMIT
  }

  // 检查限制状态
  checkRestriction(address) {
    const record = this.getUserRecord(address)
    if (!record || !record.restrictionStartTime) return false
    
    const now = Date.now()
    const restrictionEnd = record.restrictionStartTime + (LOCAL_TEST_CONFIG.RESTRICTION_DAYS * 24 * 60 * 60 * 1000)
    
    return now < restrictionEnd
  }

  // 清理所有数据
  clearAllData() {
    localStorage.removeItem(this.storageKey)
  }

  // 测试功能：快速设置7天限制状态
  setTestRestriction(address) {
    const data = this.getAllData()
    const now = Date.now()
    
    let record = data[address] || {
      totalSpins: 0,
      totalWins: 0,
      consecutiveWins: 0,
      dailySpinCount: 0,
      lastSpinDate: null,
      winHistory: [],
      restrictionStartTime: null
    }

    // 设置限制开始时间为7天前，这样用户就在限制期内
    record.restrictionStartTime = now - (6 * 24 * 60 * 60 * 1000) // 6天前开始限制
    
    data[address] = record
    this.saveAllData(data)
    return record
  }

  // 测试功能：快速设置周度限制状态
  setTestSevenDayLimit(address) {
    const data = this.getAllData()
    const now = Date.now()
    
    let record = data[address] || {
      totalSpins: 0,
      totalWins: 0,
      consecutiveWins: 0,
      dailySpinCount: 0,
      lastSpinDate: null,
      winHistory: [],
      restrictionStartTime: null
    }

    // 添加3次获胜记录，触发周度限制
    for (let i = 0; i < 3; i++) {
      record.winHistory.push({
        date: new Date(now - (i * 24 * 60 * 60 * 1000)).toDateString(),
        resultIndex: 0, // 获胜选项
        timestamp: now - (i * 24 * 60 * 60 * 1000)
      })
    }
    
    record.totalWins = 3
    record.restrictionStartTime = now // 触发限制
    
    data[address] = record
    this.saveAllData(data)
    return record
  }

  // 测试功能：重置用户状态
  resetUserState(address) {
    const data = this.getAllData()
    delete data[address]
    this.saveAllData(data)
  }
} 
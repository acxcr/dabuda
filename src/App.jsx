import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button.jsx'
import { Volume2, VolumeX, Settings } from 'lucide-react'
import { WalletConnect } from '@/components/WalletConnect'
import { TransactionModal } from '@/components/TransactionModal'
import { NetworkModal } from '@/components/NetworkModal'
import { TransactionStatus } from '@/components/TransactionStatus'
import { SevenDayLimitModal } from '@/components/SevenDayLimitModal'
import useWeb3, { useContract } from './hooks/useWeb3'
import ErrorBoundary from '@/components/ErrorBoundary'
import './App.css'
import { LocalStorage } from './config/localTest'

function AppContent() {
  const [language, setLanguage] = useState('en')
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [history, setHistory] = useState([
    // 初始历史记录为空
  ])
  // 新增：保存当前结果的 index
  const [resultIndex, setResultIndex] = useState(null)
  // 新增：跟踪转盘动画是否已完成
  const [wheelAnimationCompleted, setWheelAnimationCompleted] = useState(false)
  
  // 交易弹窗状态
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [pendingTransaction, setPendingTransaction] = useState(null)
  
  // 交易状态
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [transactionHash, setTransactionHash] = useState(null)
  
  // Web3 相关状态
  const { 
    account, 
    isConnected, 
    isConnecting, 
    provider, 
    chainId, 
    connectWallet, 
    disconnect,
    checkMonadNetwork,
    switchToMonad
  } = useWeb3()
  
  // 创建LocalStorage实例
  const [localStorageInstance] = useState(() => new LocalStorage())
  
  // 确保LocalStorage实例在组件加载时初始化
  useEffect(() => {
    if (localStorageInstance) {
      console.log('🔍 LocalStorage实例已创建')
    }
  }, [localStorageInstance])
  
  // 网络状态
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [showNetworkModal, setShowNetworkModal] = useState(false)
  const [networkAction, setNetworkAction] = useState('add') // 'add' 或 'switch'
  
  // Toast 状态
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' })
  
  const showToast = (message, type = 'error') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000)
  }
  
  const { userRecord, hasThreeWins, isRestricted, playGameWithResult, isLoading } = useContract()
  
  // 调试信息
  console.log('🔍 App状态:', { 
    account, 
    isConnected, 
    isConnecting, 
    userRecord: userRecord ? {
      totalSpins: userRecord.totalSpins,
      totalWins: userRecord.totalWins,
      dailySpinCount: userRecord.dailySpinCount,
      hasThreeWins,
      winHistory: userRecord.winHistory
    } : null
  })

  // 重置转盘动画完成状态
  useEffect(() => {
    if (!userRecord) {
      setWheelAnimationCompleted(false)
    }
  }, [userRecord])

  // 网络检测
  useEffect(() => {
    const checkNetwork = async () => {
      console.log('🔍 网络检测触发:', { isConnected, provider: !!provider })
      
      if (isConnected && provider) {
        console.log('🔍 开始检查网络...')
        const networkStatus = await checkMonadNetwork()
        console.log('🔍 网络检查结果:', networkStatus)
        setIsCorrectNetwork(networkStatus.isMonad)
        
        if (!networkStatus.isMonad) {
          console.log('🔍 显示网络切换弹窗，操作类型:', networkStatus.action)
          setNetworkAction(networkStatus.action)
          setShowNetworkModal(true)
        } else {
          setShowNetworkModal(false)
        }
      }
    }
    
    checkNetwork()
  }, [isConnected, provider, checkMonadNetwork])

  // 监听网络变化
  useEffect(() => {
    if (isConnected && provider) {
      const handleChainChanged = async () => {
        console.log('🔄 检测到网络变化，重新检查...')
        const networkStatus = await checkMonadNetwork()
        setIsCorrectNetwork(networkStatus.isMonad)
        
        if (!networkStatus.isMonad) {
          setNetworkAction(networkStatus.action)
          setShowNetworkModal(true)
        } else {
          setShowNetworkModal(false)
        }
      }

      // 监听网络变化事件
      provider.on('chainChanged', handleChainChanged)
      
      return () => {
        provider.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [isConnected, provider, checkMonadNetwork])

  // 监听钱包网络/账户变化自动检测
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = () => {
        console.log('🔄 检测到网络变化事件')
        checkNetworkBeforeAction()
      }
      
      const handleAccountsChanged = () => {
        console.log('🔄 检测到账户变化事件')
        checkNetworkBeforeAction()
      }
      
      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  // 链接钱包后检测网络
  useEffect(() => {
    if (isConnected) {
      checkNetworkBeforeAction()
    }
  }, [isConnected])

  // 被动网络检测函数（增强：设置UI状态）
  const checkNetworkBeforeAction = async () => {
    if (!isConnected || !provider) {
      setNetworkStatusText(language === 'en' ? 'Wallet not connected' : '钱包未连接')
      setNetworkStatusColor('gray')
      return false
    }
    
    try {
      const networkStatus = await checkMonadNetwork()
      setIsCorrectNetwork(networkStatus.isMonad)
      
      if (networkStatus.isMonad) {
        setNetworkStatusText(language === 'en' ? 'Monad Testnet' : 'Monad 测试网')
        setNetworkStatusColor('green')
        setShowNetworkModal(false)
        return true
      } else {
        setNetworkStatusText(language === 'en' ? 'Wrong Network' : '网络错误')
        setNetworkStatusColor('red')
        setNetworkAction(networkStatus.action)
        setShowNetworkModal(true)
        return false
      }
    } catch (error) {
      console.error('网络检测失败:', error)
      setNetworkStatusText(language === 'en' ? 'Network Error' : '网络错误')
      setNetworkStatusColor('red')
      setShowNetworkModal(true)
      return false
    }
  }

  // 处理网络切换
  const handleSwitchNetwork = async () => {
    try {
      await switchToMonad()
      setIsCorrectNetwork(true)
      setShowNetworkModal(false)
      
      // 网络切换成功后，检查是否可以继续之前的操作
      setTimeout(() => {
        if (userRecord && userRecord.dailySpinCount >= 1) {
          // 如果按钮是"1"，可以继续转盘
          console.log('网络切换成功，可以继续转盘操作')
        } else if (!isRestricted) {
          // 如果按钮是"开始"，可以继续交易
          console.log('网络切换成功，可以继续交易操作')
        }
      }, 1000)
      
    } catch (error) {
      console.error('切换网络失败:', error)
      alert(language === 'en' ? 'Failed to switch network: ' + error.message : '切换网络失败: ' + error.message)
    }
  }

  const wheelRef = useRef(null)
  const audioRef = useRef(null)
  const wheelSoundRef = useRef(null) // 新增：转盘音效引用
  const audioContextRef = useRef(null) // 新增：音频上下文
  const analyserRef = useRef(null) // 新增：音频分析器
  const audioSourceRef = useRef(null) // 新增：音频源
  const rhythmDataRef = useRef(null) // 新增：节奏数据
  const currentResultRef = useRef(null)
  const [headerLeft, setHeaderLeft] = useState(0)
  const [networkStatusText, setNetworkStatusText] = useState('')
  const [networkStatusColor, setNetworkStatusColor] = useState('gray')

  useEffect(() => {
    if (currentResultRef.current) {
      const rect = currentResultRef.current.getBoundingClientRect()
      setHeaderLeft(rect.left)
    }
  }, [language]) // 语言切换时也重新定位

  // 转盘选项数据 - 支持多语言
  const wheelOptionsData = {
    en: [
      // 6个"打"的选项
      { text: 'Chain blast', type: 'win', emoji: '��', color: '#FF6B6B' },
      { text: 'Free mint today', type: 'win', emoji: '🔥', color: '#4ECDC4' },
      { text: 'Gas good', type: 'win', emoji: '💸', color: '#45B7D1' },
      { text: 'Max active', type: 'win', emoji: '📶', color: '#96CEB4' },
      { text: 'Snap lock', type: 'win', emoji: '💪', color: '#FFEAA7' },
      { text: 'Chain blast', type: 'win', emoji: '🧿', color: '#DDA0DD' },
      
      // 12个"不打"的选项
      { text: 'Sleep now', type: 'lose', emoji: '🛏', color: '#74B9FF' },
      { text: 'Drop dead', type: 'lose', emoji: '🧊', color: '#A29BFE' },
      { text: 'No active', type: 'lose', emoji: '❌', color: '#FD79A8' },
      { text: 'Rush fail', type: 'lose', emoji: '🤯', color: '#FDCB6E' },
      { text: 'Later check', type: 'lose', emoji: '📵', color: '#6C5CE7' },
      { text: 'Project dead', type: 'lose', emoji: '💀', color: '#E17055' },
      { text: 'Sleep now', type: 'lose', emoji: '😪', color: '#00B894' },
      { text: 'Don\'t stay up', type: 'lose', emoji: '🌙', color: '#00CEC9' },
      { text: 'Night pal', type: 'lose', emoji: '👀', color: '#2D3436' },
      { text: 'Wakeup worker', type: 'lose', emoji: '🧠', color: '#636E72' },
      { text: 'Rush kills', type: 'lose', emoji: '☠️', color: '#B2BEC3' },
      { text: 'Chosen one?', type: 'lose', emoji: '🧞', color: '#55A3FF' }
    ],
    zh: [
      // 6个"打"的选项
      { text: '火箭发射', type: 'win', emoji: '🚀', color: '#FF6B6B' },
      { text: '今天free mint', type: 'win', emoji: '🔥', color: '#4ECDC4' },
      { text: 'gas正香', type: 'win', emoji: '💸', color: '#45B7D1' },
      { text: '活跃溢出', type: 'win', emoji: '📶', color: '#96CEB4' },
      { text: '表现拉满', type: 'win', emoji: '💪', color: '#FFEAA7' },
      { text: '必中快照', type: 'win', emoji: '🧿', color: '#DDA0DD' },
      
      // 12个"不打"的选项
      { text: '洗洗睡吧', type: 'lose', emoji: '🛏', color: '#74B9FF' },
      { text: '空投凉透', type: 'lose', emoji: '🧊', color: '#A29BFE' },
      { text: '活跃不足', type: 'lose', emoji: '❌', color: '#FD79A8' },
      { text: '猴急爆掉', type: 'lose', emoji: '🤯', color: '#FDCB6E' },
      { text: '回头再看', type: 'lose', emoji: '📵', color: '#6C5CE7' },
      { text: '项目沉了', type: 'lose', emoji: '💀', color: '#E17055' },
      { text: '早点睡吧', type: 'lose', emoji: '😪', color: '#00B894' },
      { text: '别熬夜了', type: 'lose', emoji: '🌙', color: '#00CEC9' },
      { text: '和黑暗成闺蜜', type: 'lose', emoji: '👀', color: '#2D3436' },
      { text: '清醒点打工人', type: 'lose', emoji: '🧠', color: '#636E72' },
      { text: '一冲命没了', type: 'lose', emoji: '☠️', color: '#B2BEC3' },
      { text: '你是天选？', type: 'lose', emoji: '🧞', color: '#55A3FF' }
    ]
  }

  const wheelOptions = wheelOptionsData[language]

  // 多语言文本
  const texts = {
    en: {
      title: 'Magic Wheel DApp',
      subtitle: 'Should I trade today?',
      spin: 'Start',
      language: 'Language',
      connect: 'Connect',
      currentResult: 'Current Result',
      history: 'History',
      win: 'WIN',
      lose: 'NO!',
      shareText: 'I just spun the Magic Wheel! 🎡',
      shareButton: 'Share to X (Twitter)',
      close: 'Close',
      share: 'Share',
      waiting: 'Waiting for result...',
      web3Gaming: 'Web3 Gaming',
      web3GamingDesc: 'Experience the magic of decentralized fortune telling',
      monadNetwork: 'Monad Network',
      monadNetworkDesc: 'Powered by next-gen blockchain technology'
    },
    zh: {
      title: 'Magic Wheel DApp',
      subtitle: '今天打不打？',
      spin: '开始',
      language: '语言',
      connect: '连接',
      currentResult: '当前结果',
      history: '历史记录',
      win: '打！',
      lose: '不打！',
      shareText: '我刚刚转了魔性转盘！🎡',
      shareButton: '分享到 X (Twitter)',
      close: '关闭',
      share: '分享',
      waiting: '等待转盘结果...',
      web3Gaming: 'Web3 游戏',
      web3GamingDesc: '体验去中心化占卜的魅力',
      monadNetwork: 'Monad 网络',
      monadNetworkDesc: '由下一代区块链技术驱动'
    }
  }

  const t = texts[language]

  // 分析音频文件，获取节奏数据
  const analyzeAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const response = await fetch('/00004.mp3')
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      
      // 获取音频数据
      const channelData = audioBuffer.getChannelData(0)
      const sampleRate = audioBuffer.sampleRate
      const duration = audioBuffer.duration
      
      // 分析节奏：检测音量峰值
      const peaks = []
      const threshold = 0.1 // 音量阈值
      const minPeakDistance = sampleRate * 0.1 // 最小峰值间隔（0.1秒）
      
      for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) > threshold) {
          if (peaks.length === 0 || (i - peaks[peaks.length - 1]) > minPeakDistance) {
            peaks.push(i)
          }
        }
      }
      
      // 转换为时间戳
      const peakTimes = peaks.map(peak => peak / sampleRate)
      
      // 计算节奏间隔
      const intervals = []
      for (let i = 1; i < peakTimes.length; i++) {
        intervals.push(peakTimes[i] - peakTimes[i - 1])
      }
      
      // 存储节奏数据
      rhythmDataRef.current = {
        peakTimes,
        intervals,
        duration,
        sampleRate
      }
      

      
    } catch (error) {
      console.error('音频分析失败:', error)
    }
  }

  // 根据真实节奏数据生成缓动函数
  const generateRhythmBasedEasing = (progress) => {
    if (!rhythmDataRef.current) {
      // 如果没有节奏数据，使用默认缓动
      return progress
    }
    
    const { peakTimes, duration } = rhythmDataRef.current
    const currentTime = progress * duration
    
    // 找到当前时间对应的峰值
    let rhythmProgress = 0
    for (let i = 0; i < peakTimes.length; i++) {
      if (currentTime >= peakTimes[i]) {
        rhythmProgress = i / (peakTimes.length - 1)
      }
    }
    
    // 使用更平滑的插值，减少模糊感
    const smoothProgress = Math.pow(rhythmProgress, 0.6) // 更平滑的曲线
    return smoothProgress
  }

  // 组件挂载时分析音频
  useEffect(() => {
    analyzeAudio()
  }, [])

  // 转盘旋转函数（基于真实音频分析，优化流畅度）
  // 点击开始前检测网络
  const spinWheel = async () => {
    if (isSpinning) return
    
    if (!isConnected) {
      showToast(language === 'en' ? 'Please connect wallet first' : '请先连接钱包')
      return
    }
    
    const isCorrect = await checkNetworkBeforeAction()
    
    if (!isCorrect) {
      return
    }
    
    // 检查周度限制
    console.log('🔍 周度限制检查:', { userRecord, hasThreeWins, ignoreSevenDayLimit })
    if (userRecord && hasThreeWins && !ignoreSevenDayLimit) {
      console.log('🔍 触发周度限制弹窗')
      setShowSevenDayLimitModal(true)
      return
    }
    
    // 网络正确，继续原有逻辑
    if (userRecord && userRecord.dailySpinCount >= 1) {
      startWheelAnimation()
      return
    }
    startTransaction()
  }

  // 开始交易流程
  const startTransaction = async () => {
    try {
      // 随机选择一个格子
      const randomIndex = Math.floor(Math.random() * wheelOptions.length)
      setResultIndex(randomIndex)
      
      // 设置待处理的交易
      setPendingTransaction({
        resultIndex: randomIndex,
        gasEstimate: '0.001',
        networkName: 'Monad Testnet'
      })
      
      // 显示交易确认弹窗
      setShowTransactionModal(true)
      
    } catch (error) {
      console.error('交易失败:', error)
      alert(language === 'en' ? 'Transaction failed: ' + error.message : '交易失败: ' + error.message)
    }
  }

  // 处理交易确认
  const handleTransactionConfirm = async () => {
    try {
      // 关闭交易确认弹窗
      setShowTransactionModal(false)
      setPendingTransaction(null)
      
      // 显示交易处理中状态
      setTransactionStatus('pending')
      setTransactionHash('0x' + Math.random().toString(16).substr(2, 64))
      
      // 模拟交易处理时间
      setTimeout(async () => {
        try {
          // 调用智能合约进行交易
          await playGameWithResult(pendingTransaction.resultIndex)
          
          // 交易成功
          setTransactionStatus('confirmed')
          console.log('交易成功，按钮应该变成"1"')
          
          // 3秒后关闭状态弹窗
          setTimeout(() => {
            setTransactionStatus(null)
            setTransactionHash(null)
          }, 3000)
          
        } catch (error) {
          console.error('交易失败:', error)
          setTransactionStatus('failed')
          
          // 3秒后关闭状态弹窗
          setTimeout(() => {
            setTransactionStatus(null)
            setTransactionHash(null)
          }, 3000)
          
          alert(language === 'en' ? 'Transaction failed: ' + error.message : '交易失败: ' + error.message)
        }
      }, 2000) // 模拟2秒处理时间
      
    } catch (error) {
      console.error('交易失败:', error)
      setShowTransactionModal(false)
      setPendingTransaction(null)
      alert(language === 'en' ? 'Transaction failed: ' + error.message : '交易失败: ' + error.message)
    }
  }

  // 处理交易拒绝
  const handleTransactionReject = () => {
    setShowTransactionModal(false)
    setPendingTransaction(null)
    console.log('用户拒绝了交易')
  }

  // 开始转盘动画
  const startWheelAnimation = () => {
    setIsSpinning(true)
    setShowResult(false)
    
    // 播放转盘旋转音效（使用现有的00004.mp3）
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(error => {
        console.error('音效播放失败:', error)
      })
    }
    
    // 每个格子占20度（360/18），让转盘停在格子中心
    const segmentAngle = 360 / wheelOptions.length // 20度
    const targetAngle = resultIndex * segmentAngle + segmentAngle / 2 // 格子中心角度
    
    // 转5-10圈，然后停在目标角度
    const spins = 5 + Math.floor(Math.random() * 5)
    const finalRotation = spins * 360 + (360 - targetAngle) // 360 - targetAngle 保证指针在12点方向
    
    // 每次动画都从0度开始，确保每次转相同的圈数
    const startTime = Date.now()
    const duration = 7000 // 恢复7秒，匹配音效时长
    const startRotation = 0 // 每次都从0度开始
    
    // 使用更高的帧率和硬件加速
    const targetFPS = 120 // 提高帧率到120fps
    const frameInterval = 1000 / targetFPS
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 使用基于真实音频分析的缓动函数
      const easeProgress = generateRhythmBasedEasing(progress)
      
      // 使用更平滑的旋转计算
      const currentRotation = startRotation + finalRotation * easeProgress
      
      // 使用transform3d触发硬件加速，减少模糊
      setRotation(currentRotation)
      
      if (progress < 1) {
        // 使用更精确的帧率控制
        setTimeout(() => {
          requestAnimationFrame(animate)
        }, frameInterval)
      } else {
        // 动画结束，停止音效
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        
        setIsSpinning(false)
        const selectedOption = wheelOptions[resultIndex]
        setResult(selectedOption)
        setShowResult(true)
        
        // 转盘动画结束后，按钮应该变灰并不可用
        setWheelAnimationCompleted(true)
        
        const newRecord = {
          result: selectedOption.text,
          type: selectedOption.type,
          time: new Date().toLocaleTimeString(),
          emoji: selectedOption.emoji,
          language: language
        }
        setHistory(prev => [newRecord, ...prev.slice(0, 6)])
      }
    }
    
    // 开始动画
    requestAnimationFrame(animate)
  }

  // 分享功能
  const shareResult = () => {
    if (result) {
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `${t.shareText} 结果: ${result.text} ${result.emoji}`
      )}`
      window.open(shareUrl, '_blank')
    }
  }

  // Arcade 彩蛋提示语
  const arcadeMessages = {
    zh: [
      '你很闲吗？',
      '别乱按啦！',
      '你真有空！',
      '再按也没彩蛋哦！',
      '既然你这么喜欢你就按按看吧'
    ],
    en: [
      'Are you bored?',
      'Stop pressing randomly!',
      'You really have time!',
      'No easter egg here!',
      'If you like it so much, just keep pressing.'
    ]
  }

  const arcadeTitle = {
    zh: '魔法转盘 街机',
    en: 'MAGIC WHEEL ARCADE'
  }

  const [arcadeStage, setArcadeStage] = useState(0) // 0~4，5为终止
  const [arcadeCount, setArcadeCount] = useState(0)
  const [arcadeActive, setArcadeActive] = useState(true)
  const [arcadeScreen, setArcadeScreen] = useState(arcadeTitle[language])
  const arcadeTimeoutRef = useRef(null)
  const lastArcadeClickRef = useRef(null)

  // 语言切换时同步屏幕内容
  useEffect(() => {
    // 无论是否激活，都同步语言
    if (arcadeActive && arcadeStage === 0) {
      // 如果还在初始阶段，显示标题
      setArcadeScreen(arcadeTitle[language])
    } else if (!arcadeActive) {
      // 如果体验已结束，也显示标题
      setArcadeScreen(arcadeTitle[language])
    }
    // 如果正在显示提示语，不改变，等2.5秒后自动恢复
  }, [language])

  // 红色按钮点击处理
  const handleArcadeButton = () => {
    if (!arcadeActive) return
    const now = Date.now()
    if (lastArcadeClickRef.current && now - lastArcadeClickRef.current > 2000) {
      // 超时，终止体验
      setArcadeActive(false)
      setArcadeScreen(arcadeTitle[language])
      return
    }
    lastArcadeClickRef.current = now
    let nextStage = arcadeStage
    let nextCount = arcadeCount + 1
    // 阶段阈值
    const thresholds = [1, 5, 19, 33, 133]
    if (nextCount === thresholds[nextStage]) {
      // 显示对应提示
      setArcadeScreen(arcadeMessages[language][nextStage])
      // 2.5秒后恢复标题
      if (arcadeTimeoutRef.current) clearTimeout(arcadeTimeoutRef.current)
      arcadeTimeoutRef.current = setTimeout(() => {
        setArcadeScreen(arcadeTitle[language])
      }, 2500)
      // 进入下一个阶段
      nextStage++
      // 如果到达终止阶段
      if (nextStage === thresholds.length) {
        setArcadeActive(false)
      }
      setArcadeStage(nextStage)
      setArcadeCount(nextCount)
    } else if (nextCount < thresholds[thresholds.length - 1]) {
      setArcadeCount(nextCount)
    } else {
      // 超过最大阈值后，彻底无提示
      setArcadeActive(false)
      setArcadeScreen(arcadeTitle[language])
    }
  }

  const languageBtnRef = useRef(null)
  const [languageMenuPos, setLanguageMenuPos] = useState({ top: 0, left: 0, width: 0 })

  // 语言菜单定位
  const handleShowLanguageMenu = () => {
    if (languageBtnRef.current) {
      const rect = languageBtnRef.current.getBoundingClientRect()
      setLanguageMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
    setShowLanguageMenu((v) => !v)
  }

  // 语言菜单点击空白关闭
  useEffect(() => {
    if (!showLanguageMenu) return;
    function handleClick(e) {
      // 检查点击的是否是语言菜单选项
      const isLanguageOption = e.target.closest('.language-menu-option');
      if (
        languageBtnRef.current &&
        !languageBtnRef.current.contains(e.target) &&
        !isLanguageOption
      ) {
        setShowLanguageMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showLanguageMenu]);

  // 周度限制相关状态
  const [showSevenDayLimitModal, setShowSevenDayLimitModal] = useState(false)
  const [ignoreSevenDayLimit, setIgnoreSevenDayLimit] = useState(false)
  const [wheelDisabled, setWheelDisabled] = useState(false)
  const [pendingSevenDayAction, setPendingSevenDayAction] = useState(null)

  // 处理三垒打成就确认
  const handleSevenDayConfirm = () => {
    setShowSevenDayLimitModal(false)
    setIgnoreSevenDayLimit(false) // 重置忽略状态
    setWheelDisabled(true) // 禁用转盘
    console.log('🔍 用户选择休整，转盘已禁用')
    showToast(language === 'en' ? 'Wheel disabled - weekly limit reached' : '转盘已禁用 - 已达周度限制')
  }

  // 处理三垒打成就取消
  const handleSevenDayCancel = () => {
    setShowSevenDayLimitModal(false)
    setIgnoreSevenDayLimit(true) // 用户选择忽略周度限制
    console.log('🔍 用户选择继续游戏，忽略周度限制')
    // 不直接调用spinWheel，让用户重新点击开始按钮
  }

  return (
    <ErrorBoundary>
      <div className="h-screen min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative flex flex-col">
      {/* 背景粒子效果 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars"></div>
        <div className="twinkling"></div>
      </div>
      
      {/* 头部导航 */}
      <header className="relative z-10 flex justify-between items-center p-6">
        <div>
          <h1 className="text-3xl font-bold text-pink-400 glow-text">{t.title}</h1>
          <p className="text-cyan-300 text-2xl font-semibold tracking-wide mt-2 glow-text-cyan">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3" style={{ paddingRight: '8rem' }}>
          {/* 音效控制 */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:bg-cyan-500/30"
          >
            {soundEnabled ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
          </Button>
          {/* 语言切换下拉 */}
          <button
            ref={languageBtnRef}
            onClick={handleShowLanguageMenu}
            className="bg-white text-gray-800 px-4 py-2 rounded shadow border border-gray-300 text-sm font-medium hover:bg-gray-100"
            style={{ minWidth: '90px' }}
          >
            Language
          </button>
          {showLanguageMenu && createPortal(
            <div
              style={{
                position: 'absolute',
                top: languageMenuPos.top,
                left: languageMenuPos.left,
                width: languageMenuPos.width,
                zIndex: 99999
              }}
            >
              <div className="bg-white border border-gray-300 rounded-lg shadow-lg w-full">
                <button
                  onClick={() => { setLanguage('en'); setShowLanguageMenu(false) }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-200 rounded text-gray-800 text-sm flex items-center gap-2 cursor-pointer language-menu-option ${language === 'en' ? 'font-bold bg-gray-100' : ''}`}
                  style={{ minHeight: '36px', lineHeight: '36px' }}
                >
                  EN
                </button>
                <button
                  onClick={() => { setLanguage('zh'); setShowLanguageMenu(false) }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-200 rounded text-gray-800 text-sm flex items-center gap-2 cursor-pointer language-menu-option ${language === 'zh' ? 'font-bold bg-gray-100' : ''}`}
                  style={{ minHeight: '36px', lineHeight: '36px' }}
                >
                  CN
                </button>
              </div>
            </div>,
            document.body
          )}
          {/* 钱包连接 */}
          <WalletConnect 
            language={language} 
            showToast={showToast}
          />
          
          {/* 测试按钮 - 开发环境使用 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => {
                  if (account && localStorageInstance) {
                    const result = localStorageInstance.setTestSevenDayLimit(account)
                    console.log('🔍 设置周度限制测试结果:', result)
                    showToast(language === 'en' ? 'Set weekly limit test' : '设置周度限制测试')
                    // 强制重新获取用户记录
                    window.location.reload()
                  } else {
                    console.log('🔍 无法设置周度限制测试:', { account, localStorageInstance })
                  }
                }}
                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
              >
                周度限制
              </button>
              <button
                onClick={() => {
                  if (account && localStorageInstance) {
                    localStorageInstance.resetUserState(account)
                    setWheelDisabled(false) // 重置转盘禁用状态
                    setIgnoreSevenDayLimit(false) // 重置忽略周度限制状态
                    showToast(language === 'en' ? 'Reset user state' : '重置用户状态')
                    window.location.reload()
                  }
                }}
                className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
              >
                重置
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4" style={{ marginTop: '-5vh' }}>
        <div className="w-full max-w-7xl mx-auto grid grid-cols-5 gap-8 items-center h-full">
          
          {/* 左侧复古街机元素 */}
          <div className="col-span-1 flex justify-center">
            <div className="relative">
              {/* 复古街机机身 */}
              <div className="relative bg-gradient-to-b from-gray-800 via-gray-900 to-black rounded-t-3xl rounded-b-lg p-6 shadow-2xl border-4 border-gray-600">
                {/* 街机屏幕 */}
                <div className="relative bg-black rounded-lg p-4 mb-4 border-2 border-gray-500">
                  <div className="bg-gradient-to-br from-green-400 to-green-600 rounded p-3 text-center">
                    <div className="flex items-center justify-center h-16">
                      <span className="text-black font-mono text-lg font-bold select-none" style={{letterSpacing: '1px'}}>{arcadeScreen}</span>
                    </div>
                  </div>
                  {/* 屏幕反光效果 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg pointer-events-none"></div>
                </div>
                
                {/* 控制面板 */}
                <div className="space-y-3">
                  {/* 按钮行1 */}
                  <div className="flex justify-center gap-2">
                    <button className="w-8 h-8 bg-red-500 rounded-full shadow-lg border-2 border-red-700 focus:outline-none active:scale-95 transition-transform" onClick={handleArcadeButton}></button>
                    <div className="w-8 h-8 bg-blue-500 rounded-full shadow-lg border-2 border-blue-700"></div>
                  </div>
                  
                  {/* 按钮行2 */}
                  <div className="flex justify-center gap-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded-full shadow-lg border-2 border-yellow-700"></div>
                    <div className="w-6 h-6 bg-green-500 rounded-full shadow-lg border-2 border-green-700"></div>
                    <div className="w-6 h-6 bg-purple-500 rounded-full shadow-lg border-2 border-purple-700"></div>
                  </div>
                  
                  {/* 操纵杆 */}
                  <div className="flex justify-center mt-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-700 rounded-full border-4 border-gray-500 shadow-lg"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-red-600 rounded-full border-2 border-red-800"></div>
                    </div>
                  </div>
                </div>
                
                {/* 街机底部装饰 */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-red-500 to-purple-500 rounded-b-lg"></div>
                
                {/* 侧面装饰线 */}
                <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-r"></div>
                <div className="absolute right-0 top-4 bottom-4 w-1 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-l"></div>
              </div>
            </div>
          </div>

          {/* 中央转盘区域 */}
          <div className="col-span-3 flex flex-col items-center justify-center">
            <div className="relative">
              {/* 转盘容器 - 放大尺寸 */}
              <div className="relative w-[600px] h-[600px]">
                
                {/* SVG转盘 */}
                <svg 
                  ref={wheelRef}
                  className="w-full h-full"
                  style={{ 
                    transform: `rotate3d(0, 0, 1, ${rotation}deg)`,
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                    perspective: '1000px',
                    filter: isSpinning ? 'blur(0.5px)' : 'none'
                  }}
                  viewBox="0 0 400 400"
                >
                  {wheelOptions.map((option, index) => {
                    const angle = (360 / wheelOptions.length) * index
                    const nextAngle = (360 / wheelOptions.length) * (index + 1)
                    const midAngle = (angle + nextAngle) / 2
                    
                    // emoji位置 - 在格子内部，更靠近中心
                    const emojiRadius = 120
                    const emojiX = 200 + emojiRadius * Math.cos((midAngle - 90) * Math.PI / 180)
                    const emojiY = 200 + emojiRadius * Math.sin((midAngle - 90) * Math.PI / 180)
                    
                    // 文字位置 - 在指针上方一点，距离更近
                    const textRadius = 155
                    const textX = 200 + textRadius * Math.cos((midAngle - 90) * Math.PI / 180)
                    const textY = 200 + textRadius * Math.sin((midAngle - 90) * Math.PI / 180)
                    
                    // 计算路径
                    const startAngleRad = (angle - 90) * Math.PI / 180
                    const endAngleRad = (nextAngle - 90) * Math.PI / 180
                    const largeArcFlag = (nextAngle - angle) > 180 ? 1 : 0
                    
                    const x1 = 200 + 190 * Math.cos(startAngleRad)
                    const y1 = 200 + 190 * Math.sin(startAngleRad)
                    const x2 = 200 + 190 * Math.cos(endAngleRad)
                    const y2 = 200 + 190 * Math.sin(endAngleRad)
                    
                    const pathData = `M 200 200 L ${x1} ${y1} A 190 190 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
                    
                    return (
                      <g key={index}>
                        {/* 格子背景 */}
                        <path
                          d={pathData}
                          fill={option.color}
                          stroke="white"
                          strokeWidth="2"
                        />
                        
                        {/* emoji - 在格子内部 */}
                        <text
                          x={emojiX}
                          y={emojiY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="16"
                          fontWeight="700"
                          style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}
                        >
                          {option.emoji}
                        </text>
                        
                        {/* 文字组 - 在指针上方，距离更近 */}
                        <g transform={`translate(${textX}, ${textY}) rotate(${midAngle})`}>
                          {/* 根据语言和文字内容决定排列方式 */}
                          {(() => {
                            const text = option.text;
                            
                            // 中文转盘的处理逻辑（保持不变）
                            if (language === 'zh') {
                              // 特殊处理：包含英语词汇的文字
                              if (text.includes('free mint')) {
                                return (
                                  <>
                                    <text x="0" y="-8" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>今天</text>
                                    <text x="0" y="4" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>free</text>
                                    <text x="0" y="16" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>mint</text>
                                  </>
                                );
                              }
                              
                              // 特殊处理：gas正香 - gas作为一个整体
                              if (text.includes('gas正香')) {
                                return (
                                  <>
                                    <text x="0" y="-6" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>gas</text>
                                    <text x="0" y="6" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>正香</text>
                                  </>
                                );
                              }
                              
                              // 特殊处理：你是天选？ - 添加问号
                              if (text === '你是天选？') {
                                return (
                                  <>
                                    <text x="0" y="-8" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>你是</text>
                                    <text x="0" y="4" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>天选</text>
                                    <text x="0" y="16" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>？</text>
                                  </>
                                );
                              }
                              
                              // 其他中文文字的处理逻辑
                              if (text.length <= 2) {
                                // 很短文字：水平排列
                                return (
                                  <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                    {text}
                                  </text>
                                );
                              } else if (text.length <= 4) {
                                // 中等长度：2x2排列
                                return text.match(/.{1,2}/g).map((chunk, chunkIndex) => (
                                  <text key={chunkIndex} x="0" y={-8 + chunkIndex * 16} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="13" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                    {chunk}
                                  </text>
                                ));
                              } else {
                                // 长文字：垂直排列，每行2个字符
                                return text.match(/.{1,2}/g).map((chunk, chunkIndex) => (
                                  <text key={chunkIndex} x="0" y={-12 + chunkIndex * 12} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                    {chunk}
                                  </text>
                                ));
                              }
                            } else {
                              // 英文转盘的处理逻辑 - 完全重新设计
                              const words = text.split(' ');
                              
                              if (words.length === 1) {
                                // 单个单词：直接显示
                                return (
                                  <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                    {text}
                                  </text>
                                );
                              } else if (words.length === 2) {
                                // 两个单词：垂直排列，特殊处理长单词
                                const fontSize = text.length > 12 ? "11" : "13";
                                return words.map((word, wordIndex) => (
                                  <text key={wordIndex} x="0" y={-8 + wordIndex * 16} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={fontSize} fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                    {word}
                                  </text>
                                ));
                              } else if (words.length === 3) {
                                // 三个单词：垂直排列，特殊处理长文本
                                const fontSize = text.length > 15 ? "10" : "12";
                                return words.map((word, wordIndex) => (
                                  <text key={wordIndex} x="0" y={-12 + wordIndex * 12} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={fontSize} fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                    {word}
                                  </text>
                                ));
                              } else {
                                // 四个或更多单词：分两列显示，特殊处理长文本
                                const leftWords = words.slice(0, Math.ceil(words.length / 2));
                                const rightWords = words.slice(Math.ceil(words.length / 2));
                                const fontSize = text.length > 18 ? "9" : "10";
                                
                                return (
                                  <>
                                    {/* 左列 */}
                                    <g transform="translate(-15, 0)">
                                      {leftWords.map((word, wordIndex) => (
                                        <text key={`left-${wordIndex}`} x="0" y={-8 + wordIndex * 12} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={fontSize} fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                          {word}
                                        </text>
                                      ))}
                                    </g>
                                    {/* 右列 */}
                                    <g transform="translate(15, 0)">
                                      {rightWords.map((word, wordIndex) => (
                                        <text key={`right-${wordIndex}`} x="0" y={-8 + wordIndex * 12} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={fontSize} fontWeight="700" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>
                                          {word}
                                        </text>
                                      ))}
                                    </g>
                                  </>
                                );
                              }
                            }
                          })()}
                        </g>
                      </g>
                    )
                  })}
                </svg>
                
                {/* 中心按钮和指针 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* 中心指针 - 消除空隙并改变颜色 */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 z-30">
                      <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[36px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg"
                           style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' }}></div>
                    </div>
                    
                    {/* 按钮阴影 */}
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-black/30 blur-md transform translate-y-2"></div>
                    
                    {/* 主按钮 */}
                    <button
                      onClick={spinWheel}
                      disabled={isSpinning || isLoading || wheelAnimationCompleted || wheelDisabled}
                      className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-500 via-pink-500 to-red-600 hover:from-red-600 hover:via-pink-600 hover:to-red-700 text-white font-bold text-lg shadow-2xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        boxShadow: '0 0 30px rgba(239, 68, 68, 0.5), inset 0 2px 10px rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      <span className="relative z-10">
                        {wheelDisabled ? '🚫' :
                         wheelAnimationCompleted ? t.spin :
                         isSpinning ? '🎡' : 
                         isLoading ? '⏳' : 
                         !isConnected ? t.connect :
                         (userRecord && userRecord.dailySpinCount >= 1) ? '1' : t.spin}
                      </span>
                      
                      {/* 内部高光效果 */}
                      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧信息区域 */}
          <div className="col-span-1 pr-8">
            <div className="space-y-8">
              {/* 当前结果 */}
              <div className="text-center">
                <h3 ref={currentResultRef} className="text-cyan-300 font-bold text-2xl tracking-wide mb-6">{t.currentResult}</h3>
                {resultIndex !== null && result ? (
                  <div className="space-y-4">
                    <div className="text-3xl mb-2">{result.emoji}</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {result.type === 'win' ? t.win : t.lose}
                    </div>
                    <div className="text-lg text-gray-300 mb-4">
                      {wheelOptions[resultIndex].text}
                    </div>
                    <Button
                      onClick={shareResult}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-6 py-3 rounded-lg"
                    >
                      {t.shareButton}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-3xl mb-2">🎡</div>
                    <div className="text-lg text-gray-400">{t.waiting}</div>
                  </div>
                )}
              </div>

              {/* 历史记录 */}
              <div className="text-center">
                <h3 className="text-cyan-300 font-bold text-2xl tracking-wide mb-6">{t.history}</h3>
                <div className="space-y-3">
                  {history.slice(0, 7).map((record, index) => {
                    // 根据当前语言显示历史记录
                    const displayText = record.type === 'win' ? 
                      (language === 'en' ? 'WIN' : '打！') : 
                      (language === 'en' ? 'NO!' : '不打！')
                    
                    return (
                      <div key={index} className="flex items-center justify-center gap-2">
                        <div className="text-lg">{record.emoji}</div>
                        <div>
                          <div className="text-base font-bold text-white leading-tight">{displayText}</div>
                          <div className="text-[10px] text-gray-400 leading-tight">{record.time}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 结果弹窗 */}
      {showResult && result && resultIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50"></div>
          <div 
            className="relative bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-6 text-center text-white shadow-2xl max-w-sm mx-4"
            style={{
              position: 'fixed',
              top: '75%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              marginLeft: '0px'
            }}
          >
            <div className="text-6xl mb-4">{result.emoji}</div>
            <div className="text-2xl font-bold mb-2">
              {result.type === 'win' ? t.win : t.lose}
            </div>
            <div className="text-lg mb-4">
              {wheelOptions[resultIndex].text}
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => setShowResult(false)}
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                {t.close}
              </Button>
              <Button
                onClick={shareResult}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {t.share}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 音频元素 */}
      <audio ref={audioRef} preload="auto">
        <source src="/00004.mp3" type="audio/mpeg" />
      </audio>
      
      {/* 转盘旋转音效 */}
      <audio ref={wheelSoundRef} preload="auto">
        <source src="/wheel-spin.mp3" type="audio/mpeg" />
      </audio>

      {/* 交易弹窗 */}
      {showTransactionModal && pendingTransaction && (
        <TransactionModal
          isOpen={showTransactionModal}
          onConfirm={handleTransactionConfirm}
          onReject={handleTransactionReject}
          onClose={() => setShowTransactionModal(false)}
          gasEstimate={pendingTransaction.gasEstimate}
          networkName={pendingTransaction.networkName}
          language={language}
        />
      )}

      {/* 网络切换弹窗 */}
      {showNetworkModal && (
        <NetworkModal
          isOpen={showNetworkModal}
          onClose={() => setShowNetworkModal(false)}
          onSwitch={handleSwitchNetwork}
          networkAction={networkAction}
          language={language}
        />
      )}

      {/* 交易状态弹窗 */}
      {transactionStatus && (
        <TransactionStatus
          isOpen={!!transactionStatus}
          status={transactionStatus}
          hash={transactionHash}
          onClose={() => {
            setTransactionStatus(null)
            setTransactionHash(null)
          }}
          language={language}
        />
      )}

      {/* Toast 提示 */}
      {toast.show && (
        <div className="fixed top-32 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg" style={{ maxWidth: '300px' }}>
          {toast.message}
        </div>
      )}

      {/* 页面右上角常驻网络状态提示 */}
      {/* This block is removed as per the edit hint to move the network status to the header */}

              {/* 周度限制弹窗 */}
        <SevenDayLimitModal
        isOpen={showSevenDayLimitModal}
        onClose={() => setShowSevenDayLimitModal(false)}
        onConfirm={handleSevenDayConfirm}
        onCancel={handleSevenDayCancel}
        language={language}
      />
    </div>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App


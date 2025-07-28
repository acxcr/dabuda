import { useState, useEffect, useCallback } from 'react'

const useWeb3 = () => {
  const [account, setAccount] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [provider, setProvider] = useState(null)
  const [chainId, setChainId] = useState(null)
  
  // 初始化检查
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        setProvider(window.ethereum)
        
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            setAccount(accounts[0])
            setIsConnected(true)
            const chainId = await window.ethereum.request({ method: 'eth_chainId' })
            setChainId(chainId)
            console.log('✅ 检测到已连接的钱包:', accounts[0])
          }
        } catch (error) {
          console.error('检查连接状态失败:', error)
        }
      }
    }

    checkConnection()
  }, [])
  
  // 连接钱包函数
  const connectWallet = useCallback(async (walletType = 'metamask') => {
    console.log('🦊 connectWallet被调用，walletType:', walletType)
    
    if (isConnecting) {
      console.log('🦊 正在连接中，跳过重复请求')
      return
    }

    setIsConnecting(true)

    try {
      // 直接尝试连接，不检查具体类型
      console.log('🦊 尝试直接连接钱包...')
      
      if (typeof window.ethereum === 'undefined') {
        throw new Error('请安装 MetaMask 钱包')
      }

      // 直接使用window.ethereum，不管是什么钱包
      console.log('🦊 使用当前钱包提供者:', window.ethereum)
      
      // 请求连接
      console.log('🦊 开始请求账户...')
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      console.log('🦊 账户获取成功:', accounts)

      if (accounts.length === 0) {
        throw new Error('未获取到账户')
      }

      // 获取链ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      console.log('🦊 链ID获取成功:', chainId)

      // 更新状态
      setAccount(accounts[0])
      setIsConnected(true)
      setChainId(chainId)
      setProvider(window.ethereum)

      console.log('✅ 钱包连接完成')
      return accounts[0]

    } catch (error) {
      console.error('❌ 连接钱包失败:', error)
      
      // 详细错误处理
      if (error.code === 4001) {
        throw new Error('用户拒绝了连接请求')
      } else if (error.code === -32002) {
        throw new Error('MetaMask正在处理中，请稍候')
      } else {
        throw error
      }
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting])
  
  // 断开连接
  const disconnect = useCallback(() => {
    setAccount(null)
    setIsConnected(false)
    setChainId(null)
    setProvider(null)
  }, [])
  
  // 监听账户变化
  useEffect(() => {
    if (provider) {
      const handleAccountsChanged = (accounts) => {
        console.log('🔄 账户变化:', accounts)
        if (accounts.length === 0) {
          setAccount(null)
          setIsConnected(false)
          setChainId(null)
        } else {
          setAccount(accounts[0])
          setIsConnected(true)
        }
      }

      const handleChainChanged = (chainId) => {
        console.log('🔄 链变化:', chainId)
        setChainId(chainId)
      }

      const handleConnect = () => {
        console.log('🔄 钱包连接事件')
        // 重新检查连接状态
        checkConnection()
      }

      const handleDisconnect = () => {
        console.log('🔄 钱包断开事件')
        setAccount(null)
        setIsConnected(false)
        setChainId(null)
      }

      provider.on('accountsChanged', handleAccountsChanged)
      provider.on('chainChanged', handleChainChanged)
      provider.on('connect', handleConnect)
      provider.on('disconnect', handleDisconnect)

      return () => {
        provider.removeListener('accountsChanged', handleAccountsChanged)
        provider.removeListener('chainChanged', handleChainChanged)
        provider.removeListener('connect', handleConnect)
        provider.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [provider])

  // 重新检查连接状态的函数
  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          setChainId(chainId)
          console.log('✅ 重新检测到已连接的钱包:', accounts[0])
        }
      } catch (error) {
        console.error('重新检查连接状态失败:', error)
      }
    }
  }

  // 检查网络状态
  const checkMonadNetwork = useCallback(async () => {
    if (!provider) return { isMonad: false, action: 'none' }
    
    try {
      // 第一步：确保已授权
      await provider.request({ method: 'eth_requestAccounts' })
      
      // 第二步：获取授权后当前链ID（此时最可靠）
      const chainId = await provider.request({ method: 'eth_chainId' })
      console.log('🔍 授权后获取的真实 Chain ID:', chainId)
      
      // 获取网络详细信息
      try {
        const networkVersion = await provider.request({ method: 'net_version' })
        console.log('🔍 网络版本:', networkVersion)
      } catch (e) {
        console.log('🔍 无法获取网络版本:', e.message)
      }
      
      // Monad 测试网的 Chain ID (实际值)
      const MONAD_TESTNET_CHAIN_ID = '0x2797' // 10143 的十六进制表示
      
      // 第三步：比对是否是 Monad 网络
      const isCurrentlyOnMonad = chainId === MONAD_TESTNET_CHAIN_ID
      console.log('🔍 当前是否在 Monad 测试网:', isCurrentlyOnMonad)
      console.log('🔍 期望的 Monad Chain ID:', MONAD_TESTNET_CHAIN_ID)
      console.log('🔍 实际的 Chain ID:', chainId)
      
      if (isCurrentlyOnMonad) {
        return { isMonad: true, action: 'none' }
      } else {
        // 检查是否在其他已知网络
        const knownNetworks = {
          '0x1': 'Ethereum Mainnet/Bitcoin', // 以太坊主网和BTC网络都使用0x1
          '0x89': 'Polygon',
          '0xa': 'Optimism',
          '0xa4b1': 'Arbitrum',
          '0x38': 'BSC',
          '0x2105': 'Base',
          '0xa86a': 'Avalanche',
          '0x0': 'All Networks' // OKX 钱包的"所有网络"
        }
        
        const networkName = knownNetworks[chainId]
        console.log('🔍 检测到的网络:', networkName || '未知网络')
        
        // 如果检测到已知网络但不是Monad，就是切换
        if (knownNetworks[chainId]) {
          console.log('🔍 检测到其他已知网络:', knownNetworks[chainId], '需要切换')
          return { isMonad: false, action: 'switch' }
        } else {
          console.log('🔍 检测到未知网络，可能需要添加 Monad 网络')
          return { isMonad: false, action: 'add' }
        }
      }
    } catch (error) {
      console.error('检查网络失败:', error)
      return { isMonad: false, action: 'add' }
    }
  }, [provider])

  // 切换到 Monad 测试网
  const switchToMonad = useCallback(async () => {
    if (!provider) {
      throw new Error('请先连接钱包')
    }
    
    try {
      // Monad 测试网的 Chain ID (实际值)
      const MONAD_TESTNET_CHAIN_ID = '0x2797' // 10143 的十六进制表示
      
      console.log('🔄 尝试切换到 Monad 测试网:', MONAD_TESTNET_CHAIN_ID)
      
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET_CHAIN_ID }],
      })
      
      console.log('✅ 已切换到 Monad 测试网')
      return true
    } catch (switchError) {
      console.log('🔄 切换网络失败，错误代码:', switchError.code)
      
      // 如果网络不存在，尝试添加网络
      if (switchError.code === 4902) {
        console.log('🔄 网络不存在，尝试添加网络')
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2797', // 10143 的十六进制表示
              chainName: 'Monad Testnet',
              nativeCurrency: {
                name: 'MONAD',
                symbol: 'MON',
                decimals: 18
              },
              rpcUrls: ['https://testnet-rpc.monad.xyz'],
              blockExplorerUrls: ['https://testnet.monadexplorer.com']
            }],
          })
          console.log('✅ 已添加并切换到 Monad 测试网')
          return true
        } catch (addError) {
          console.error('添加网络失败:', addError)
          throw new Error('添加 Monad 测试网失败')
        }
      } else {
        console.error('切换网络失败:', switchError)
        throw new Error('切换网络失败')
      }
    }
  }, [provider])

  return {
    account,
    isConnected,
    isConnecting,
    provider,
    chainId,
    connectWallet,
    disconnect,
    checkMonadNetwork,
    switchToMonad
  }
}

export default useWeb3

export function useContract() {
  const [userRecord, setUserRecord] = useState(null)
  const [hasThreeWins, setHasThreeWins] = useState(false)
  const [isRestricted, setIsRestricted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { account, isConnected } = useWeb3()
  
  // 导入本地测试工具
  const [localStorageInstance, setLocalStorageInstance] = useState(null)
  
  useEffect(() => {
    import('@/config/localTest').then(({ LocalStorage }) => {
      const instance = new LocalStorage()
      setLocalStorageInstance(instance)
      console.log('🔍 LocalStorage实例已创建:', instance)
      // 不再自动清理数据，让用户手动控制
      console.log('🔍 LocalStorage数据已加载')
    })
  }, [])
  
  // 获取用户记录
  const getUserRecord = () => {
    if (!account || !localStorageInstance) {
      console.log('🔍 getUserRecord: 缺少必要参数', { account, localStorageInstance })
      return null
    }
    const record = localStorageInstance.getUserRecord(account)
    console.log('🔍 getUserRecord: 获取到的记录', { account, record })
    return record
  }
  
  // 检查限制状态
  const checkRestriction = () => {
    if (!account || !localStorageInstance) return false
    return localStorageInstance.checkRestriction(account)
  }
  
  // 检查每日限制
  const checkDailyLimit = () => {
    if (!account || !localStorageInstance) return false
    return localStorageInstance.checkDailyLimit(account)
  }
  
  // 更新状态
  useEffect(() => {
    if (account && localStorageInstance) {
      const record = getUserRecord()
      setUserRecord(record)
      
      // 检查7天内是否获胜3次
      if (record && record.winHistory) {
        const now = Date.now()
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
        const recentWins = record.winHistory.filter(win => win.timestamp > sevenDaysAgo)
        const hasThreeWinsValue = recentWins.length >= 3
        console.log('🔍 hasThreeWins计算:', { 
          record, 
          winHistory: record.winHistory, 
          recentWins, 
          recentWinsLength: recentWins.length,
          hasThreeWins: hasThreeWinsValue 
        })
        setHasThreeWins(hasThreeWinsValue)
      } else {
        console.log('🔍 hasThreeWins计算: 无记录或无winHistory', { record })
        setHasThreeWins(false)
      }
      
      setIsRestricted(checkRestriction())
    } else {
      // 如果没有连接钱包，清空状态
      setUserRecord(null)
      setHasThreeWins(false)
      setIsRestricted(false)
    }
  }, [account, localStorageInstance])
  
  // 本地测试合约调用
  const playGameWithResult = async (resultIndex) => {
    if (!window.ethereum) {
      throw new Error('请安装 MetaMask')
    }
    if (!isConnected || !account) {
      throw new Error('请先连接钱包')
    }
    
    setIsLoading(true)
    
    try {
      // 检查每日限制
      if (!checkDailyLimit()) {
        throw new Error('今日次数已用完')
      }
      
      // 移除限制期检查，因为用户要求取消限制期逻辑
      // if (checkRestriction()) {
      //   throw new Error('您在限制期内，无法游戏')
      // }
      
      // 模拟交易确认
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const account = accounts[0]
      
      // 模拟交易延迟
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 更新本地记录
      if (localStorageInstance) {
        const updatedRecord = localStorageInstance.updateGameRecord(account, resultIndex)
        setUserRecord(updatedRecord)
        setHasThreeWins(updatedRecord.consecutiveWins >= 3)
        // 移除限制期检查
        // setIsRestricted(localStorageInstance.checkRestriction(account))
      }
      
      return true
    } catch (error) {
      console.error('游戏失败:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  
  return {
    userRecord,
    hasThreeWins,
    isRestricted,
    playGameWithResult,
    isLoading
  }
} 
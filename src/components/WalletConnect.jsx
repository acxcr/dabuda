import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import useWeb3 from '@/hooks/useWeb3'

export function WalletConnect({ language, showToast }) {
  const {
    account,
    isConnected,
    isConnecting,
    connectWallet, 
    disconnect
  } = useWeb3()

  const [showConnectors, setShowConnectors] = useState(false)
  const [showDisconnectMenu, setShowDisconnectMenu] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef(null)
  const disconnectBtnRef = useRef(null)

  // 断开链接菜单定位
  const [disconnectMenuPos, setDisconnectMenuPos] = useState({ top: 0, left: 0, width: 0 })
  const handleShowDisconnectMenu = () => {
    if (disconnectBtnRef.current) {
      const rect = disconnectBtnRef.current.getBoundingClientRect()
      setDisconnectMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
    setShowDisconnectMenu((v) => !v)
  }

  // 钱包下拉菜单点击空白关闭
  useEffect(() => {
    if (!showConnectors) return;
    function handleClick(e) {
      // 检查点击的是否是菜单选项
      const isMenuOption = e.target.closest('.wallet-menu-option');
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target) &&
        !isMenuOption
      ) {
        setShowConnectors(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showConnectors]);

  // 断开链接菜单点击空白关闭
  useEffect(() => {
    if (!showDisconnectMenu) return;
    function handleClick(e) {
      // 检查点击的是否是断开链接按钮
      const isDisconnectButton = e.target.closest('.disconnect-button');
      if (
        disconnectBtnRef.current &&
        !disconnectBtnRef.current.contains(e.target) &&
        !isDisconnectButton
      ) {
        setShowDisconnectMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDisconnectMenu]);

  // 多语言文本
  const texts = {
    en: {
      connect: 'Connect Wallet',
      connecting: 'Connecting...',
      metamask: 'MetaMask',
      okx: 'OKX Wallet',
      disconnect: 'Disconnect'
    },
    zh: {
      connect: '连接钱包',
      connecting: '连接中...',
      metamask: 'MetaMask',
      okx: 'OKX 钱包',
      disconnect: '断开连接'
    }
  }
  const t = texts[language]

  // 格式化地址显示
  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // 处理钱包连接
  const handleConnect = async (walletType) => {
    setShowConnectors(false)
    if (isConnecting) return
    try {
      await connectWallet(walletType)
    } catch (error) {
      let errorMessage = ''
      if (error.message.includes('用户拒绝了连接请求')) {
        errorMessage = language === 'en' 
          ? 'Connection failed: User rejected the connection request' 
          : '连接失败: 用户拒绝了连接请求'
      } else if (error.message.includes('请安装 MetaMask')) {
        errorMessage = language === 'en' 
          ? 'Connection failed: Please install MetaMask' 
          : '连接失败: 请安装 MetaMask'
      } else if (error.message.includes('请先连接钱包')) {
        errorMessage = language === 'en' 
          ? 'Connection failed: Please connect wallet first' 
          : '连接失败: 请先连接钱包'
      } else {
        errorMessage = language === 'en' 
          ? `Connection failed: ${error.message}` 
          : `连接失败: ${error.message}`
      }
      if (showToast) {
        showToast(errorMessage)
      }
    }
  }

  // 计算下拉菜单位置
  const handleShowConnectors = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
    setShowConnectors((v) => !v)
  }

  // If connected, show address and disconnect button
  if (isConnected && account) {
    return (
      <div className="relative wallet-connect-container">
        <button ref={disconnectBtnRef} onClick={handleShowDisconnectMenu} className="text-cyan-300 bg-transparent border-none px-2 py-1 rounded cursor-pointer text-sm hover:underline" style={{ minWidth: '120px' }}>
          {formatAddress(account)}
        </button>
        {showDisconnectMenu && createPortal(
          <div style={{ position: 'absolute', top: disconnectMenuPos.top, left: disconnectMenuPos.left, width: disconnectMenuPos.width, zIndex: 99999 }}>
            <div className="bg-red-600 border border-red-700 rounded-lg shadow-lg w-full">
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); disconnect(); setShowDisconnectMenu(false) }} className="w-full text-left px-3 py-2 hover:bg-red-700 rounded text-white text-base flex items-center gap-2 cursor-pointer justify-center transition-all duration-150 disconnect-button" style={{ minHeight: '36px', lineHeight: '36px', fontSize: '15px' }}>
                <span style={{ fontSize: '15px', marginRight: '4px' }}>🔌</span> {t.disconnect}
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // 渲染toast提示
  return (
    <>
      {/* 钱包连接按钮 */}
      <button
        ref={btnRef}
        onClick={handleShowConnectors}
        disabled={isConnecting}
        className="bg-white text-gray-800 px-4 py-2 rounded shadow border border-gray-300 text-sm font-medium hover:bg-gray-100"
      >
        {isConnecting ? t.connecting : t.connect}
      </button>

      {/* 钱包连接下拉菜单 */}
      {showConnectors && createPortal(
        <div style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}>
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg w-full">
            <button onClick={() => handleConnect('metamask')} className="w-full text-left px-3 py-2 hover:bg-gray-200 rounded text-gray-800 text-sm flex items-center gap-2 cursor-pointer wallet-menu-option" style={{ minHeight: '36px', lineHeight: '36px' }}>
              <span style={{ fontSize: '15px', marginRight: '4px' }}>🦊</span> {t.metamask}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
} 
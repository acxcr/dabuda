import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function TransactionModal({ 
  isOpen, 
  onConfirm, 
  onReject, 
  onClose,
  gasEstimate = '0.001',
  networkName = 'Monad Testnet',
  language = 'en'
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 多语言文本
  const texts = {
    en: {
      title: 'Confirm Transaction',
      network: 'Network',
      gasFee: 'Gas Fee',
      confirm: 'Confirm',
      reject: 'Reject',
      confirming: 'Confirming...',
      estimatedGas: 'Estimated Gas',
      transactionDetails: 'Transaction Details',
      magicWheelSpin: 'Magic Wheel Spin'
    },
    zh: {
      title: '确认交易',
      network: '网络',
      gasFee: 'Gas 费用',
      confirm: '确认',
      reject: '拒绝',
      confirming: '确认中...',
      estimatedGas: '预估 Gas',
      transactionDetails: '交易详情',
      magicWheelSpin: '魔法转盘游戏'
    }
  }

  const t = texts[language]

  // 处理确认交易
  const handleConfirm = async () => {
    setIsConfirming(true)
    setCountdown(3)
    
    // 模拟确认过程
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsConfirming(false)
          onConfirm()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 处理拒绝交易
  const handleReject = () => {
    onReject()
  }

  // 点击背景关闭
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-sm">
                🦊
              </div>
              <h3 className="text-white font-medium text-sm">{t.title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-4">
          {/* 交易类型 */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t.magicWheelSpin}</span>
              <span className="text-gray-800 font-medium">Contract Interaction</span>
            </div>
          </div>

          {/* 网络信息 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">{t.network}</span>
              <span className="text-blue-600 font-medium">{networkName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t.estimatedGas}</span>
              <span className="font-mono text-xs">{gasEstimate} MONAD</span>
            </div>
          </div>

          {/* 交易哈希 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Transaction Hash</span>
              <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                0x1234...5678
              </span>
            </div>
          </div>

          {/* 按钮区域 */}
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isConfirming}
              className="flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-medium rounded text-sm transition-colors"
            >
              {t.reject}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded text-sm transition-colors"
            >
              {isConfirming ? `${t.confirming} ${countdown}s` : t.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 
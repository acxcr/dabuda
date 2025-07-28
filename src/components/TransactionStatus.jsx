import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export function TransactionStatus({ 
  isOpen, 
  status, 
  hash,
  onClose,
  language = 'en'
}) {
  const [progress, setProgress] = useState(0)

  const texts = {
    en: {
      pending: 'Transaction Pending',
      confirmed: 'Transaction Confirmed',
      failed: 'Transaction Failed',
      processing: 'Processing...',
      viewOnExplorer: 'View on Explorer'
    },
    zh: {
      pending: '交易处理中',
      confirmed: '交易已确认',
      failed: '交易失败',
      processing: '处理中...',
      viewOnExplorer: '在浏览器中查看'
    }
  }

  const t = texts[language]

  useEffect(() => {
    if (isOpen && status === 'pending') {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(timer)
            return 90
          }
          return prev + 10
        })
      }, 500)
      return () => clearInterval(timer)
    }
  }, [isOpen, status])

  useEffect(() => {
    if (status === 'confirmed') {
      setProgress(100)
    }
  }, [status])

  if (!isOpen) return null

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'text-yellow-600'
      case 'confirmed': return 'text-green-600'
      case 'failed': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return '⏳'
      case 'confirmed': return '✅'
      case 'failed': return '❌'
      default: return '⏳'
    }
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white text-sm">
                {getStatusIcon()}
              </div>
              <h3 className="text-white font-medium text-sm">{t[status]}</h3>
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
          {/* 进度条 */}
          {status === 'pending' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{t.processing}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* 交易哈希 */}
          {hash && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Transaction Hash</span>
                <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                  {hash}
                </span>
              </div>
            </div>
          )}

          {/* 状态信息 */}
          <div className="text-center">
            <div className={`text-lg font-semibold ${getStatusColor()} mb-2`}>
              {status === 'confirmed' ? 'Confirmed' : status === 'failed' ? 'Failed' : t.processing}
            </div>
            {status === 'confirmed' && (
              <button 
                onClick={() => window.open(`https://explorer.testnet.monad.xyz/tx/${hash}`, '_blank')}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                {t.viewOnExplorer}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 
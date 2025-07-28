import { createPortal } from 'react-dom'

export function NetworkModal({ 
  isOpen, 
  onSwitch, 
  onClose,
  networkAction = 'add', // 'add' 或 'switch'
  language = 'en'
}) {
  const texts = {
    en: {
      addTitle: 'Add Network',
      switchTitle: 'Switch Network',
      addMessage: 'Please add Monad Testnet to use this DApp',
      switchMessage: 'Please switch to Monad Testnet to use this DApp',
      switch: 'Switch Network',
      add: 'Add Network',
      cancel: 'Cancel'
    },
    zh: {
      addTitle: '添加网络',
      switchTitle: '切换网络',
      addMessage: '请添加 Monad 测试网以使用此 DApp',
      switchMessage: '请切换到 Monad 测试网以使用此 DApp',
      switch: '切换网络',
      add: '添加网络',
      cancel: '取消'
    }
  }

  const t = texts[language]
  const isAddAction = networkAction === 'add'

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                🌐
              </div>
              <h3 className="text-white font-semibold text-lg">
                {isAddAction ? t.addTitle : t.switchTitle}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 text-center">
              {isAddAction ? t.addMessage : t.switchMessage}
            </p>
          </div>

          {/* 按钮区域 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={onSwitch}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              {isAddAction ? t.add : t.switch}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 
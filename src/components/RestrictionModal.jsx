import React from 'react'

export function RestrictionModal({ isOpen, onClose, onYes, onNo, language = 'zh' }) {
  if (!isOpen) return null

  const texts = {
    zh: {
      title: '休息提醒',
      message: '你已完成三垒打，建议休息整备弹药',
      yes: '是',
      no: '否'
    },
    en: {
      title: 'Rest Reminder',
      message: 'You have completed three hits, it is recommended to rest and prepare ammunition',
      yes: 'Yes',
      no: 'No'
    }
  }

  const t = texts[language]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{t.title}</h2>
        <p className="text-gray-600 mb-6">{t.message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onNo}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            {t.no}
          </button>
          <button
            onClick={onYes}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            {t.yes}
          </button>
        </div>
      </div>
    </div>
  )
} 
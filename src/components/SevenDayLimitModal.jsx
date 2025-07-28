import React from 'react'
import { createPortal } from 'react-dom'

export const SevenDayLimitModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel, 
  language 
}) => {
  if (!isOpen) return null

  const texts = {
    en: {
      title: 'Weekly Limit Reached ⚠️',
      message: 'You\'ve reached your weekly limit. Consider taking a break to recharge.',
      confirm: 'Yes, Take Break',
      cancel: 'No, Continue'
    },
    zh: {
      title: '周度限制已达 ⚠️',
      message: '您已完成三垒打！建议休整储备弹药。',
      confirm: '是，休整',
      cancel: '否，继续'
    }
  }

  const t = texts[language]

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t.title}
          </h3>
          <p className="text-gray-600 mb-6">
            {t.message}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onConfirm}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
              {t.confirm}
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 
import * as React from "react"

const Button = React.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref) => {
  // 内联样式
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: 'none',
    outline: 'none'
  }
  
  const variantStyles = {
    default: { backgroundColor: '#2563eb', color: 'white' },
    secondary: { backgroundColor: '#e5e7eb', color: '#111827' },
    outline: { backgroundColor: 'white', color: '#111827', border: '1px solid #d1d5db' },
    ghost: { backgroundColor: 'transparent', color: '#111827' }
  }
  
  const sizeStyles = {
    default: { height: '40px', padding: '8px 16px' },
    sm: { height: '36px', padding: '6px 12px' },
    lg: { height: '44px', padding: '8px 32px' }
  }
  
  const style = { ...baseStyle, ...variantStyles[variant], ...sizeStyles[size] }
  
  return (
    <button
      style={style}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button } 
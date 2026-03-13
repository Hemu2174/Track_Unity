import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`.trim()}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export default ThemeToggle

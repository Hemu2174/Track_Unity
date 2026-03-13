import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Loader2 } from 'lucide-react'
import { loginUser } from '../services/authApi'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    try {
      setLoading(true)
      const data = await loginUser({ email, password })
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-mesh overflow-hidden">
      <div className="absolute top-8 right-8 z-20">
        <ThemeToggle />
      </div>

      <div className="glow-mesh">
        <div className="glow-blob glow-blob-1"></div>
        <div className="glow-blob glow-blob-2"></div>
      </div>

      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-dark border border-white/10 rounded-[32px] p-10 md:p-12 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h1 className="text-3xl font-bold font-outfit mb-2">Welcome Back</h1>
            <p className="text-gray-400">Continue your opportunity journey</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-gray-500 text-sm">
            Don't have an account?{' '}
            <Link to="/onboarding" className="text-blue-500 hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage

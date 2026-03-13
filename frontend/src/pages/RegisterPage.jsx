import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import ProgressBar from '../components/ProgressBar'
import StepOneForm from '../components/StepOneForm'
import StepTwoForm from '../components/StepTwoForm'
import { registerUser } from '../services/authApi'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gender: '',
    password: '',
    skills: [],
    domain: '',
    interestedRole: '',
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setApiError('')
  }

  const handleNext = () => {
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setApiError('')
    try {
      const data = await registerUser(formData)
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Registration failed. Please try again.'
      setApiError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[500px]"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white font-outfit">
              Track<span className="text-blue-500">Unity</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-sm p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4">
              <Sparkles size={13} />
              {step === 1 ? 'Create your account' : 'Almost there!'}
            </div>
            <h1 className="text-2xl font-bold text-white font-outfit">
              {step === 1 ? 'Basic Details' : 'Career Information'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {step === 1
                ? 'Start by telling us a bit about yourself.'
                : 'Help us personalize your opportunity feed.'}
            </p>
          </div>

          {/* Progress */}
          <ProgressBar currentStep={step} totalSteps={2} />

          {/* API Error */}
          <AnimatePresence>
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {apiError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Forms */}
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <StepOneForm
                key="step-1"
                formData={formData}
                onChange={handleChange}
                onNext={handleNext}
              />
            ) : (
              <StepTwoForm
                key="step-2"
                formData={formData}
                onChange={handleChange}
                onBack={handleBack}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            )}
          </AnimatePresence>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default RegisterPage

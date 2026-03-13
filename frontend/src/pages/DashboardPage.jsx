import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Search, 
  Bell, 
  ChevronDown, 
  SlidersHorizontal,
  Zap,
  LogOut
} from 'lucide-react'

// Components
import DashboardHeader from '../components/DashboardHeader'
import StatsCards from '../components/StatsCards'
import OpportunityFeed from '../components/OpportunityFeed'
import QuickAddOpportunity from '../components/QuickAddOpportunity'
import NotificationsPanel from '../components/NotificationsPanel'
import DeadlineTracker from '../components/DeadlineTracker'
import RecommendationPanel from '../components/RecommendationPanel'
import AdvancedStats from '../components/AdvancedStats'
import ThemeToggle from '../components/ThemeToggle'

// Services
import { getOpportunities, extractOpportunity, uploadPosterImage } from '../services/opportunityApi'
import { getRecommendations } from '../services/recommendationApi'

const normalizeDate = (value) => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const matchesSearch = (opportunity, searchText) => {
  const keyword = String(searchText || '').trim().toLowerCase()
  if (!keyword) {
    return true
  }

  const haystack = [
    opportunity?.title,
    opportunity?.company,
    opportunity?.role,
    opportunity?.domain,
    opportunity?.eligibility,
    ...(Array.isArray(opportunity?.skills) ? opportunity.skills : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(keyword)
}

const dedupeKeyForOpportunity = (opportunity) => {
  const title = String(opportunity?.title || '').trim().toLowerCase()
  const company = String(opportunity?.company || '').trim().toLowerCase()
  const role = String(opportunity?.role || '').trim().toLowerCase()
  const link = String(opportunity?.applicationLink || '').trim().toLowerCase()
  const deadline = normalizeDate(opportunity?.deadline)?.toISOString() || ''

  if (link) {
    return `${link}::${title}`
  }

  return `${title}::${company}::${role}::${deadline}`
}

const dedupeOpportunities = (list = []) => {
  const unique = new Map()

  for (const opportunity of list) {
    const key = dedupeKeyForOpportunity(opportunity)
    if (!unique.has(key)) {
      unique.set(key, opportunity)
    }
  }

  return Array.from(unique.values())
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const [opportunities, setOpportunities] = useState([])
  const [searchText, setSearchText] = useState('')
  const [stats, setStats] = useState({ total: 0, upcoming: 0, applied: 0 })
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState([])
  const [latestExtracted, setLatestExtracted] = useState(null)

  const visibleOpportunities = dedupeOpportunities(opportunities).filter((opportunity) => (
    matchesSearch(opportunity, searchText)
  ))

  const fetchOpportunities = async () => {
    try {
      const list = await getOpportunities()
      const deduped = dedupeOpportunities(Array.isArray(list) ? list : [])
      setOpportunities(deduped)

      const now = new Date()
      const upcoming = deduped.filter((item) => {
        const deadline = normalizeDate(item?.deadline)
        return Boolean(deadline && deadline >= now)
      })

      setStats({ total: deduped.length, upcoming: upcoming.length, applied: 0 })
    } catch (e) {
      console.error('Opportunities fetch error:', e)
    }
  }

  const fetchRecommendations = async () => {
    try {
      const response = await getRecommendations()
      setRecommendations(response?.data || [])
    } catch (error) {
      console.error('Recommendations fetch error:', error)
    }
  }

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      await Promise.all([fetchOpportunities(), fetchRecommendations()])
      setLoading(false)
    }

    void loadDashboard()
  }, [])

  const handleExtractWithAI = async (message) => {
    if (!message) return
    const result = await extractOpportunity(message)

    if (result?.extracted) {
      setLatestExtracted({
        _id: `preview-${Date.now()}`,
        title: result.extracted.title || 'Opportunity',
        company: result.extracted.company || 'Unknown Company',
        role: result.extracted.role || null,
        domain: result.extracted.domain || null,
        deadline: result.extracted.deadline || null,
        eligibility: result.extracted.eligibility || null,
        skills: result.extracted.skills || [],
        applicationLink: result.extracted.applicationLink || null,
        riskLevel: result.opportunity?.riskLevel || null,
        linkStatus: result.opportunity?.linkStatus || null,
        confidenceScore: result.extracted.confidenceScore,
      })
    }

    await fetchOpportunities()
    void fetchRecommendations()
  }

  const handleImageUpload = async (file) => {
    await uploadPosterImage(file)
    await fetchOpportunities()
    void fetchRecommendations()
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans selection:bg-blue-100">
      {/* Top Navbar */}
      <nav className="bg-white px-8 py-3 sticky top-0 z-50 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-6 flex-1 max-w-3xl">
          <div className="w-10 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Zap size={20} fill="currentColor" />
          </div>
          <div className="relative w-full max-w-xl group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              placeholder="Search opportunities"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl py-2.5 pl-11 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-medium"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-2">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-slate-100">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden md:block">{user?.name || 'User'}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-semibold text-sm transition-all"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Logout</span>
            </button>
            <ThemeToggle />
          </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-[1440px] mx-auto p-8 lg:flex gap-8">
        
        {/* Left Section (70%) */}
        <div className="flex-[0.7] space-y-8 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <DashboardHeader />
          </motion.div>

          <StatsCards stats={stats} />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <OpportunityFeed opportunities={visibleOpportunities} loading={loading} extractedPreview={latestExtracted} />
          </motion.div>

          <QuickAddOpportunity 
            onExtract={handleExtractWithAI} 
            onImageUpload={handleImageUpload} 
          />
        </div>

        {/* Right Sidebar (30%) */}
        <aside className="flex-[0.3] space-y-7">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <NotificationsPanel opportunities={opportunities} deadlines={opportunities} />
            <DeadlineTracker opportunities={opportunities} />
            <AdvancedStats opportunities={opportunities} stats={stats} />
            <RecommendationPanel recommendations={recommendations} />
          </motion.div>
        </aside>
      </main>

      {/* Footer / Spacing for mobile */}
      <div className="h-20 lg:hidden"></div>
    </div>
  )
}

export default DashboardPage

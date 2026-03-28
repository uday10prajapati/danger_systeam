import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader, AlertCircle, Sparkles, Shield, Zap, TrendingUp, Users } from 'lucide-react'
import api from '../api'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [focusedField, setFocusedField] = useState('')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Check if already logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      const response = await api.post('/login', {
        email: email.toLowerCase().trim(),
        password: password
      })

      if (response.data.success) {
        // Save user data and token
        localStorage.setItem('user', JSON.stringify(response.data.user))
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email)
        }
        navigate('/dashboard')
      } else {
        setError(response.data.error || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      console.error('Error response:', err.response?.data)
      
      // Show detailed error messages
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).join(', ')
        setError(errorMessages)
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Failed to connect to server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden flex items-center justify-center">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-40 animate-pulse delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse delay-2000"></div>
        
        {/* Additional floating shapes */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-slate-950/50"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Login form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-slide-up">
            <div className="bg-gradient-to-br from-slate-800/30 via-slate-800/20 to-slate-900/40 rounded-3xl shadow-2xl p-8 backdrop-blur-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 group">
              
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Glowing header section */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center relative mb-6">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur-2xl opacity-50 animate-pulse group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Logo circle */}
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 shadow-2xl shadow-blue-500/50">
                    <Sparkles className="w-8 h-8 text-white animate-spin-slow" />
                  </div>
                </div>
                <h1 className="text-4xl font-black text-white mb-2 mt-4 tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-300 animate-gradient">
                    SuperStore
                  </span>
                </h1>
                <p className="text-slate-300 text-base font-medium mb-4">Advanced Business Management System</p>
                <div className="flex items-center justify-center gap-3 text-xs text-slate-400 bg-slate-800/50 rounded-full px-4 py-2 w-fit mx-auto border border-slate-700/50">
                  <Shield size={14} className="text-green-400" />
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Enterprise Grade Security
                  </span>
                </div>
              </div>

              {/* Form section */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error message with animation */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 animate-in fade-in slide-in-from-top duration-300 backdrop-blur-sm">
                    <AlertCircle size={18} className="flex-shrink-0 animate-pulse" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                {/* Email field */}
                <div className="group/field">
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-200 mb-3 group-hover/field:text-blue-400 transition-colors duration-300 flex items-center gap-2">
                    <span className="text-lg">📧</span>
                    Email Address
                  </label>
                  <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'scale-105' : ''}`}>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('')}
                      placeholder="Enter your email"
                      className="w-full pl-4 pr-4 py-3.5 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:bg-slate-900 disabled:cursor-not-allowed hover:border-slate-500 group-hover/field:border-slate-400"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="group/field">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-200 mb-3 group-hover/field:text-blue-400 transition-colors duration-300 flex items-center gap-2">
                    <Lock size={16} />
                    Password
                  </label>
                  <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-105' : ''}`}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField('')}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-12 py-3.5 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 disabled:bg-slate-900 disabled:cursor-not-allowed hover:border-slate-500 group-hover/field:border-slate-400"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-3.5 transition-colors duration-300 ${focusedField === 'password' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-400'} disabled:cursor-not-allowed`}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Remember me and forgot password */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group/checkbox">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                        className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 disabled:cursor-not-allowed appearance-none cursor-pointer border-2 checked:bg-gradient-to-r checked:from-blue-600 checked:to-cyan-600 transition-all"
                      />
                      <Sparkles className="absolute w-3 h-3 text-white opacity-0 group-hover/checkbox:opacity-100 transition-opacity pointer-events-none" size={12} />
                    </div>
                    <span className="text-sm text-slate-400 group-hover/checkbox:text-slate-300 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors relative group/forgot">
                    Forgot Password?
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-300 group-hover/forgot:w-full transition-all duration-300"></span>
                  </a>
                </div>

                {/* Submit button with enhanced styling */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group/btn mt-8 ${
                    loading
                      ? 'bg-slate-700/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 hover:shadow-2xl hover:shadow-blue-500/50 active:scale-95 shadow-lg hover:scale-105'
                  }`}
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-20 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-300 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300"></div>
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Footer section */}
              <div className="mt-8 text-center border-t border-slate-700/30 pt-6">
                <p className="text-slate-400 text-sm">
                  First time here?{' '}
                  <a href="#" className="font-bold text-blue-400 hover:text-blue-300 transition-colors relative group/admin">
                    Contact administrator
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-300 group-hover/admin:w-full transition-all duration-300"></span>
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Enhanced Illustration */}
          <div className="hidden lg:flex flex-col gap-6 max-w-md animate-slide-up-delayed">
            {/* Feature cards with enhanced animations */}
            <div className="group bg-gradient-to-br from-blue-500/15 to-cyan-500/15 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/40 hover:border-blue-500/80 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/30 hover:bg-blue-500/20">
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl group-hover:scale-125 transition-transform duration-300">📊</div>
                <Zap className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">Analytics & Reports</h3>
              <p className="text-slate-300 text-sm mb-4">Real-time insights with 100+ customizable metrics</p>
              <div className="flex items-center gap-1 text-blue-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1">
                <TrendingUp size={14} /> Explore more
              </div>
            </div>

            <div className="group bg-gradient-to-br from-indigo-500/15 to-blue-500/15 backdrop-blur-lg rounded-2xl p-6 border border-indigo-500/40 hover:border-indigo-500/80 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl hover:shadow-indigo-500/30 hover:bg-indigo-500/20">
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl group-hover:scale-125 transition-transform duration-300">💼</div>
                <Shield className="w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-200 transition-colors">Business Management</h3>
              <p className="text-slate-300 text-sm mb-4">Complete control with enterprise-level tools</p>
              <div className="flex items-center gap-1 text-indigo-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1">
                <Zap size={14} /> Powerful tools
              </div>
            </div>

            <div className="group bg-gradient-to-br from-cyan-500/15 to-blue-500/15 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/40 hover:border-cyan-500/80 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl hover:shadow-cyan-500/30 hover:bg-cyan-500/20">
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl group-hover:scale-125 transition-transform duration-300">🛒</div>
                <Users className="w-5 h-5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-200 transition-colors">Sales & Inventory</h3>
              <p className="text-slate-300 text-sm mb-4">Streamlined workflows for maximum efficiency</p>
              <div className="flex items-center gap-1 text-cyan-400 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-1">
                <Users size={14} /> Collaborate better
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add global animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }
        .animate-slide-up-delayed {
          animation: slide-up 0.6s ease-out 0.2s backwards;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default Login

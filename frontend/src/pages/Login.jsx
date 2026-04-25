import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Lock, Eye, EyeOff, Loader, 
  AlertCircle, Sparkles, Shield, 
  Zap, TrendingUp, Users, ShoppingBag,
  ArrowRight, CheckCircle2, Globe
} from 'lucide-react'
import api from '../api'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [financialYears, setFinancialYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('2026-27')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [yearsLoading, setYearsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [focusedField, setFocusedField] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Fetch years when user types email
  const fetchYears = async (emailVal) => {
    if (!emailVal || !emailVal.includes('@')) return;
    try {
      setYearsLoading(true);
      const res = await api.get(`/auth/years?email=${emailVal}`);
      if (Array.isArray(res.data)) {
        setFinancialYears(res.data);
        if (res.data.length > 0) {
          setSelectedYear(res.data[0].year_label);
        }
      }
    } catch (e) {
      console.warn('Could not fetch years', e);
    } finally {
      setYearsLoading(false);
    }
  };

  const handleEmailBlur = () => {
    fetchYears(email);
    setFocusedField('');
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password || !selectedYear) {
        setError('Verification parameters required')
        setLoading(false)
        return
      }

      const response = await api.post('/login', {
        email: email.toLowerCase().trim(),
        password: password,
        financial_year: selectedYear
      })

      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
        if (rememberMe) {
          localStorage.setItem('rememberEmail', email)
        }
        navigate('/dashboard')
      } else {
        setError(response.data.error || 'Identity verification failed')
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Infrastructure connection timeout. Retry active.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-[#F8FAFC] overflow-hidden flex items-center justify-center font-sans select-none">
      
      {/* Premium Light Background Layers - Locked and Contained */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px] animate-pulse delay-2000"></div>
         <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Main Interaction Hub - Forced Center */}
      <div className="relative z-10 w-full max-w-5xl px-6 flex items-center justify-center">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full max-w-[900px]">
            
            {/* Left Content Shard - Visual Identity */}
            <div className="hidden lg:flex flex-col gap-5 animate-in fade-in slide-in-from-left duration-700">
               <div className="space-y-2">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100 rotate-3 transform hover:rotate-0 transition-all">
                     <ShoppingBag size={24} strokeWidth={2.5} />
                  </div>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-[1.1]">
                     Danger Systeam<br/>
                     <span className="text-blue-600 italic text-2xl">Management.</span>
                  </h1>
                  <p className="text-slate-400 text-[11px] font-bold max-w-[220px] leading-relaxed">
                     The next-generation industrial ledger for modern retail clusters.
                  </p>
               </div>

               <div className="space-y-2.5">
                  {[
                     { icon: Shield, text: "Enterprise security protocols", color: "text-emerald-500" },
                     { icon: Globe, text: "Multi-point distribution sync", color: "text-blue-500" },
                     { icon: Zap, text: "Instantaneous fiscal reporting", color: "text-amber-500" }
                  ].map((item, idx) => (
                     <div key={idx} className="flex items-center gap-3 group">
                        <div className={`p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm group-hover:shadow-md transition-all ${item.color}`}>
                           <item.icon size={14} strokeWidth={3} />
                        </div>
                        <span className="text-slate-500 font-black text-[9px] uppercase tracking-wider">{item.text}</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* Right Card - Login Interaction Node */}
            <div className="w-full max-w-[340px] mx-auto animate-in zoom-in-95 duration-700">
               <div className="bg-white/90 backdrop-blur-3xl p-7 rounded-[2rem] border border-white shadow-2xl shadow-slate-200/40">
                  
                  <div className="mb-5">
                     <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.4em] mb-1 italic text-center lg:text-left">Authentication Portal</p>
                     <h2 className="text-xl font-black text-slate-800 tracking-tight text-center lg:text-left">Welcome Back.</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                     {error && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-in fade-in duration-300">
                           <AlertCircle size={14} strokeWidth={3} /> {error}
                        </div>
                     )}

                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Identity Node</label>
                        <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'translate-x-1' : ''}`}>
                           <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              onFocus={() => setFocusedField('email')}
                              onBlur={handleEmailBlur}
                              className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-blue-200 transition-all font-bold text-slate-700 text-xs shadow-inner"
                              placeholder="admin@danger-systeam.com"
                              required
                           />
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Fiscal Cycle</label>
                        <div className={`relative transition-all duration-300 ${focusedField === 'year' ? 'translate-x-1' : ''}`}>
                           <select
                              value={selectedYear}
                              onChange={(e) => setSelectedYear(e.target.value)}
                              onFocus={() => setFocusedField('year')}
                              onBlur={() => setFocusedField('')}
                              className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-blue-200 transition-all font-bold text-slate-700 text-xs shadow-inner appearance-none cursor-pointer"
                              required
                           >
                              {financialYears.length > 0 ? (
                                 financialYears.map(y => (
                                    <option key={y.id} value={y.year_label}>{y.year_label}</option>
                                 ))
                              ) : (
                                 <option value="2026-27">2026-27 (Default)</option>
                              )}
                           </select>
                           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              {yearsLoading ? <Loader size={12} className="animate-spin text-blue-500" /> : <TrendingUp size={12} className="text-slate-300" />}
                           </div>
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Security Protocol</label>
                        <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'translate-x-1' : ''}`}>
                           <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              onFocus={() => setFocusedField('password')}
                              onBlur={() => setFocusedField('')}
                              className="w-full px-4 py-3 bg-[#F8FAFC] border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-blue-200 transition-all font-bold text-slate-700 text-xs shadow-inner"
                              placeholder="••••••••"
                              required
                           />
                           <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors"
                           >
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                           </button>
                        </div>
                     </div>

                     <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                           <div className={`w-3.5 h-3.5 rounded border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-slate-100 bg-slate-50'}`}>
                              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="hidden" />
                              {rememberMe && <CheckCircle2 size={8} className="text-white" strokeWidth={4} />}
                           </div>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Stay linked</span>
                        </label>
                        <button type="button" className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline italic">Recover</button>
                     </div>

                     <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3 mt-1 disabled:grayscale"
                     >
                        {loading ? (
                           <>
                              <Loader className="animate-spin" size={16} strokeWidth={3} />
                              Authenticating...
                           </>
                        ) : (
                           <>
                              Enter System <ArrowRight size={14} strokeWidth={3} />
                           </>
                        )}
                     </button>
                  </form>

                  <div className="mt-6 text-center pt-4 border-t border-slate-50">
                     <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.1em]">
                        Restricted Access Node • v4.2.0
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        html, body, #root { 
          height: 100vh !important; 
          width: 100vw !important; 
          overflow: hidden !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          position: fixed !important;
          top: 0;
          left: 0;
          touch-action: none;
        }
        * { box-sizing: border-box; }
        input::placeholder { font-style: italic; opacity: 0.5; font-weight: normal; }
      `}} />
    </div>
  )
}

export default Login

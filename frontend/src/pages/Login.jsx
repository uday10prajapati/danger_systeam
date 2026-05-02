import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
   Lock, Eye, EyeOff, Loader,
   AlertCircle, Shield,
   Zap, TrendingUp, ShoppingBag,
   ArrowRight, CheckCircle2, User, Mail, ShieldCheck
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

   const yearRef = useRef(null)
   const passwordRef = useRef(null)

   const handleKeyDown = (e, nextRef) => {
      if (e.key === 'Enter') {
         e.preventDefault()
         if (nextRef && nextRef.current) {
            nextRef.current.focus()
         } else {
            handleSubmit(e)
         }
      }
   }

   useEffect(() => {
      const user = localStorage.getItem('user');
      if (user) {
         navigate('/dashboard');
      }
   }, [navigate]);

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
   }

   const handleSubmit = async (e) => {
      e.preventDefault()
      setError('')
      setLoading(true)

      try {
         if (!email || !password || !selectedYear) {
            setError('All credentials required')
            setLoading(false)
            return
         }

         const response = await api.post('/login', {
            email: email.toLowerCase().trim(),
            password: password,
            financial_year: selectedYear
         })

         if (response.data.success) {
            const userData = response.data.user;
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('company', JSON.stringify({
               id: userData.company_id,
               company_name: userData.company_name,
               financial_year: userData.financial_year
            }));
            if (rememberMe) {
               localStorage.setItem('rememberEmail', email)
            }
            navigate('/dashboard')
         } else {
            setError(response.data.error || 'Invalid credentials')
         }
      } catch (err) {
         setError(err.response?.data?.message || err.response?.data?.error || 'Connection failed')
      } finally {
         setLoading(false)
      }
   }

   return (
      <div className="fixed inset-0 w-full h-full bg-zinc-100 flex items-center justify-center font-sans select-none overflow-hidden">
         
         <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white border border-zinc-300 shadow-2xl overflow-hidden">
            
            {/* Left Section - Identity & Stats */}
            <div className="hidden md:flex flex-col justify-between p-10 bg-zinc-50 border-r border-zinc-200">
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-zinc-800 text-white">
                        <ShoppingBag size={24} />
                     </div>
                     <h1 className="text-xl font-bold tracking-tighter text-zinc-800 uppercase">
                        Danger Systeam
                     </h1>
                  </div>
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest leading-relaxed">
                     Enterprise Accounting & Industrial Ledger Management System
                  </p>
               </div>

               <div className="space-y-3">
                  <SectionLabel>System Integrity</SectionLabel>
                  <div className="space-y-2">
                     <BenefitItem icon={<Shield size={14} />} text="Audit Certified Logs" />
                     <BenefitItem icon={<Zap size={14} />} text="Zero-Latency Sync" />
                     <BenefitItem icon={<ShieldCheck size={14} />} text="Encrypted Data Vault" />
                  </div>
               </div>

               <div className="pt-6 border-t border-zinc-200">
                  <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                     Authorized Personnel Only • v4.2.0
                  </p>
               </div>
            </div>

            {/* Right Section - Login Form */}
            <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
               <div className="mb-8">
                  <h2 className="text-lg font-bold text-zinc-800 uppercase tracking-tight">System Login</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                     Verify your credentials to enter
                  </p>
               </div>

               <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                     <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle size={14} /> {error}
                     </div>
                  )}

                  <ModalField label="Identity Node (Email)">
                     <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                           type="email"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           onBlur={handleEmailBlur}
                           onKeyDown={e => handleKeyDown(e, yearRef)}
                           className={inputCls + ' pl-10'}
                           placeholder="admin@danger.com"
                           required
                           autoFocus
                        />
                     </div>
                  </ModalField>

                  <ModalField label="Fiscal Cycle">
                     <div className="relative">
                        <TrendingUp size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <select
                           ref={yearRef}
                           value={selectedYear}
                           onChange={(e) => setSelectedYear(e.target.value)}
                           onKeyDown={e => handleKeyDown(e, passwordRef)}
                           className={inputCls + ' pl-10 cursor-pointer appearance-none'}
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
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                           {yearsLoading && <Loader size={12} className="animate-spin text-zinc-400" />}
                        </div>
                     </div>
                  </ModalField>

                  <ModalField label="Security Key">
                     <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                           ref={passwordRef}
                           type={showPassword ? 'text' : 'password'}
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           onKeyDown={e => handleKeyDown(e, null)}
                           className={inputCls + ' pl-10 pr-10'}
                           placeholder="••••••••"
                           required
                        />
                        <button
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-600"
                        >
                           {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                     </div>
                  </ModalField>

                  <div className="flex items-center justify-between pt-1">
                     <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                           type="checkbox" 
                           checked={rememberMe} 
                           onChange={(e) => setRememberMe(e.target.checked)} 
                           className="w-4 h-4 rounded-none border-zinc-300 text-blue-600"
                        />
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-600">Stay Linked</span>
                     </label>
                     <button type="button" className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Recover Access</button>
                  </div>

                  <button
                     type="submit"
                     disabled={loading}
                     className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs tracking-widest transition shadow-lg active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                     {loading ? (
                        <>
                           <Loader className="animate-spin" size={14} />
                           Authenticating...
                        </>
                     ) : (
                        <>
                           ENTER SYSTEM <ArrowRight size={14} />
                        </>
                     )}
                  </button>
               </form>
            </div>
         </div>

         <style dangerouslySetInnerHTML={{
            __html: `
         * { box-sizing: border-box; }
         input::placeholder { font-style: italic; opacity: 0.5; font-weight: normal; }
      `}} />
      </div>
   )
}

const inputCls = 'w-full px-3 py-3 bg-white border border-zinc-300 rounded-none focus:border-zinc-800 outline-none transition font-mono text-zinc-700 font-bold text-xs'

function SectionLabel({ children }) {
   return (
      <div className="flex items-center gap-3">
         <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">{children}</span>
         <div className="flex-1 h-px bg-zinc-200" />
      </div>
   )
}

function ModalField({ label, children }) {
   return (
      <div className="space-y-1">
         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-0.5">
            {label}
         </label>
         {children}
      </div>
   )
}

function BenefitItem({ icon, text }) {
   return (
      <div className="flex items-center gap-2.5">
         <div className="text-zinc-400">{icon}</div>
         <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{text}</span>
      </div>
   )
}

export default Login

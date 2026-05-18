import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { productAPI, salesAPI, healthCheck } from './api.js'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Company from './pages/Company'
import UserMaster from './pages/UserMaster'
import AccountMaster from './pages/AccountMaster'
import MemberMaster from './pages/MemberMaster'
import ItemMaster from './pages/ItemMaster'
import ItemRate from './pages/ItemRate'
import Purchase from './pages/Purchase'
import PurchaseReturn from './pages/PurchaseReturn'
import Sale from './pages/Sale'
import SaleReturn from './pages/SaleReturn'
import CashBook from './pages/CashBook'
import AccountLedger from './pages/AccountLedger'
import SabhasadLedgerSummary from './pages/SabhasadLedgerSummary'
import LedgerReport from './pages/LedgerReport'
import Rojmel from './pages/Rojmel'
import StockReport from './pages/StockReport'
import ProfitLoss from './pages/ProfitLoss'
import PurchaseReport from './pages/PurchaseReport'
import SaleReport from './pages/SaleReport'
import BarcodeScannerPage from './pages/BarcodeScannerPage'
import ModulePage from './pages/ModulePage'
import Village from './pages/Village'
import DangarEntry from './pages/DangarEntry'
import DangarRateMaster from './pages/DangarRateMaster'
import DeductionConsole from './pages/DeductionConsole'
import BardanPortfolio from './pages/BardanPortfolio'
import NarrationMaster from './pages/NarrationMaster'
import DangarMaster from './pages/DangarMaster'
import DangarPaymentReport from './pages/DangarPaymentReport'
import DangarSummaryReport from './pages/DangarSummaryReport'
import JamaBardanEntry from './pages/JamaBardanEntry'
import InterestCalculator from './pages/InterestCalculator'
import Navbar from './components/Navbar'
import Settings from './pages/Settings'

const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Login />;
  }
  return children;
};

import { useTranslation } from 'react-i18next'
function AppContent() {
  const { i18n } = useTranslation()
  const [backendStatus, setBackendStatus] = useState('Checking...')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [isAuth, setIsAuth] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (window.electron && window.electron.onNavigate) {
      window.electron.onNavigate((path) => {
        console.log('🔗 IPC Navigation Command Received:', path);
        navigate(path);
      });
    }

    // Sync HTML lang attribute with i18n for CSS targeting
    document.documentElement.lang = i18n.language || 'gu';

    // Add Browser-level shortcut for Alt + Key
    const handleGlobalKeyDown = (e) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        const routes = {
          'v': '/village',
          'm': '/members',
          'a': '/accounts',
          'i': '/items',
          'n': '/narrations',
          'd': '/dangar-master',
          'e': '/dangar-entry',
          'r': '/dangar-rates',
          'k': '/kapat',
          'b': '/bardan-portfolio',
          'j': '/interest-calculator',
          'p': '/dangar-payment-report',
          'c': '/company',
          'u': '/users',
          'z': '/rojmel'
        };

        if (routes[key]) {
          console.log(`⌨️ Web Shortcut Triggered: Alt+${key} -> Navigating to ${routes[key]}`);
          e.preventDefault();
          navigate(routes[key]);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [navigate])


  useEffect(() => {
    const checkBackend = async () => {
      try {
        const healthRes = await healthCheck()
        setBackendStatus('✅ Connected')

        // Only load data if authenticated
        const user = localStorage.getItem('user');
        if (user) {
          try {
            const prodRes = await productAPI.getAll()
            setProducts(prodRes.data)
            const salesRes = await salesAPI.getAll()
            setSales(salesRes.data)
          } catch (e) {
            console.warn('Initial data load failed', e);
          }
        }
      } catch (error) {
        console.error('Error:', error)
        setBackendStatus('❌ Disconnected')
      }
    }

    checkBackend()
  }, [])

  // Check if user is authenticated and redirect from login
  useEffect(() => {
    const user = localStorage.getItem('user')
    setIsAuth(!!user)
    
    if (user && location.pathname === '/login') {
      console.log('✅ Session found on login page, auto-redirecting...');
      navigate('/dashboard');
    }

    // Mandatory Auto-logout on close sentinel
    const handleClose = () => {
      localStorage.clear();
    };
    window.addEventListener('beforeunload', handleClose);
    return () => window.removeEventListener('beforeunload', handleClose);
  }, [location, navigate])

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50">
      {isAuth && location.pathname !== '/' && location.pathname !== '/login' && (
        <div className="flex-none sticky top-0 z-40">
          <Navbar backendStatus={backendStatus} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><UserMaster /></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute><AccountMaster /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><MemberMaster /></ProtectedRoute>} />
          <Route path="/items" element={<ProtectedRoute><ItemMaster /></ProtectedRoute>} />
          <Route path="/rates" element={<ProtectedRoute><ItemRate /></ProtectedRoute>} />
          <Route path="/village" element={<ProtectedRoute><Village /></ProtectedRoute>} />
          <Route path="/dangar-entry" element={<ProtectedRoute><DangarEntry /></ProtectedRoute>} />
          <Route path="/dangar-entry/:id" element={<ProtectedRoute><DangarEntry /></ProtectedRoute>} />
          <Route path="/dangar-rates" element={<ProtectedRoute><DangarRateMaster /></ProtectedRoute>} />
          <Route path="/dangar-payment-report" element={<ProtectedRoute><DangarPaymentReport /></ProtectedRoute>} />
          <Route path="/dangar-summary" element={<ProtectedRoute><DangarSummaryReport /></ProtectedRoute>} />
          <Route path="/kapat" element={<ProtectedRoute><DeductionConsole /></ProtectedRoute>} />
          <Route path="/bardan-portfolio" element={<ProtectedRoute><BardanPortfolio /></ProtectedRoute>} />
          <Route path="/jama-bardan-entry" element={<ProtectedRoute><JamaBardanEntry /></ProtectedRoute>} />
          <Route path="/interest-calculator" element={<ProtectedRoute><InterestCalculator /></ProtectedRoute>} />
          <Route path="/narrations" element={<ProtectedRoute><NarrationMaster /></ProtectedRoute>} />
          <Route path="/dangar-master" element={<ProtectedRoute><DangarMaster /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Sale /></ProtectedRoute>} />
          <Route path="/sales-return" element={<ProtectedRoute><SaleReturn /></ProtectedRoute>} />
          <Route path="/purchase" element={<ProtectedRoute><Purchase /></ProtectedRoute>} />
          <Route path="/purchase-return" element={<ProtectedRoute><PurchaseReturn /></ProtectedRoute>} />
          <Route path="/barcode" element={<ProtectedRoute><BarcodeScannerPage /></ProtectedRoute>} />
          <Route path="/cashbook" element={<ProtectedRoute><Rojmel /></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><AccountLedger /></ProtectedRoute>} />
          <Route path="/ledger-report" element={<ProtectedRoute><LedgerReport /></ProtectedRoute>} />
          <Route path="/rojmel" element={<ProtectedRoute><Rojmel /></ProtectedRoute>} />
          <Route path="/sabhasad-ledger" element={<ProtectedRoute><SabhasadLedgerSummary /></ProtectedRoute>} />
          <Route path="/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
          <Route path="/stock" element={<ProtectedRoute><StockReport /></ProtectedRoute>} />
          <Route path="/purchase-report" element={<ProtectedRoute><PurchaseReport /></ProtectedRoute>} />
          <Route path="/sale-report" element={<ProtectedRoute><SaleReport /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  )
}


function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App

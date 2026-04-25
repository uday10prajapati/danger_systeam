import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { productAPI, salesAPI, healthCheck } from './api.js'
import { SidebarProvider, useSidebar } from './context/SidebarContext'
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
import BardanEntry from './pages/BardanEntry'
import JamaBardanEntry from './pages/JamaBardanEntry'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

function AppContent() {
  const [backendStatus, setBackendStatus] = useState('Checking...')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [isAuth, setIsAuth] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  const location = useLocation()
  const { sidebarOpen } = useSidebar()

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const healthRes = await healthCheck()
        setBackendStatus('✅ Connected')

        // Load products
        const prodRes = await productAPI.getAll()
        setProducts(prodRes.data)

        // Load sales
        const salesRes = await salesAPI.getAll()
        setSales(salesRes.data)
      } catch (error) {
        console.error('Error:', error)
        setBackendStatus('❌ Disconnected')
      }
    }

    checkBackend()
  }, [])

  // Check if user is authenticated
  useEffect(() => {
    const user = localStorage.getItem('user')
    setIsAuth(!!user)
  }, [location])

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50">
      <div className="flex flex-1 overflow-hidden relative">
        {isAuth && location.pathname !== '/' && location.pathname !== '/login' && <Sidebar />}
        <div 
          className="flex-1 overflow-y-auto w-full h-full pb-10 flex flex-col"
          style={{
            marginLeft: isAuth && location.pathname !== '/' && location.pathname !== '/login' && isDesktop
              ? '256px' 
              : '0px',
            transition: 'margin-left 300ms ease-in-out',
          }}
        >
          {isAuth && location.pathname !== '/' && location.pathname !== '/login' && (
            <div className="flex-none sticky top-0 z-30 shadow-sm bg-white">
              <Navbar backendStatus={backendStatus} />
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/company" element={<Company />} />
              <Route path="/users" element={<UserMaster />} />
              <Route path="/accounts" element={<AccountMaster />} />
              <Route path="/members" element={<MemberMaster />} />
              <Route path="/items" element={<ItemMaster />} />
              <Route path="/rates" element={<ItemRate />} />
              <Route path="/village" element={<Village />} />
              <Route path="/dangar-entry" element={<DangarEntry />} />
              <Route path="/dangar-rates" element={<DangarRateMaster />} />
              <Route path="/bardan-entry" element={<BardanEntry />} />
              <Route path="/jama-bardan-entry" element={<JamaBardanEntry />} />
              
              {/* Transactions */}
              <Route path="/sales" element={<Sale />} />
              <Route path="/sales-return" element={<SaleReturn />} />
              <Route path="/purchase" element={<Purchase />} />
              <Route path="/purchase-return" element={<PurchaseReturn />} />
              
              {/* Tools & Reports */}
              <Route path="/barcode" element={<BarcodeScannerPage />} />
              <Route path="/cashbook" element={<Rojmel />} />
              <Route path="/ledger" element={<AccountLedger />} />
              <Route path="/ledger-report" element={<LedgerReport />} />
              <Route path="/rojmel" element={<Rojmel />} />
              <Route path="/sabhasad-ledger" element={<SabhasadLedgerSummary />} />
              <Route path="/profit-loss" element={<ProfitLoss />} />
              <Route path="/stock" element={<StockReport />} />
              <Route path="/purchase-report" element={<PurchaseReport />} />
              <Route path="/sale-report" element={<SaleReport />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <SidebarProvider>
      <Router>
        <AppContent />
      </Router>
    </SidebarProvider>
  )
}

export default App

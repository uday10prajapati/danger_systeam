import { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
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
import StockReport from './pages/StockReport'
import ProfitLoss from './pages/ProfitLoss'
import BarcodeScannerPage from './pages/BarcodeScannerPage'
import ModulePage from './pages/ModulePage'
import Navbar from './components/Navbar'

function AppContent() {
  const [backendStatus, setBackendStatus] = useState('Checking...')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [isAuth, setIsAuth] = useState(false)
  const location = useLocation()

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
    <div>
      {isAuth && location.pathname !== '/' && location.pathname !== '/login' && <Navbar backendStatus={backendStatus} />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Setup & Configuration */}
        <Route path="/company" element={<Company />} />
        <Route path="/users" element={<UserMaster />} />
        <Route path="/accounts" element={<AccountMaster />} />
        <Route path="/members" element={<MemberMaster />} />
        <Route path="/items" element={<ItemMaster />} />
        <Route path="/rates" element={<ItemRate />} />
        
        {/* Transactions */}
        <Route path="/sales" element={<Sale />} />
        <Route path="/sales-return" element={<SaleReturn />} />
        <Route path="/purchase" element={<Purchase />} />
        <Route path="/purchase-return" element={<PurchaseReturn />} />
        
        {/* Tools & Reports */}
        <Route path="/barcode" element={<BarcodeScannerPage />} />
        <Route path="/cashbook" element={<CashBook />} />
        <Route path="/ledger" element={<AccountLedger />} />
        <Route path="/profit-loss" element={<ProfitLoss />} />
        <Route path="/stock" element={<StockReport />} />
      </Routes>
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

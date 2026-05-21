import React from 'react';
import { useLocation, Link, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Define the route map for breadcrumbs
const ROUTE_MAP = {
  '/dashboard': { label: 'modules.dashboard', parent: null },
  '/reports': { label: 'modules.reports', parent: null },
  '/village': { label: 'modules.villageMaster', parent: 'modules.master' },
  '/members': { label: 'modules.memberMaster', parent: 'modules.master' },
  '/accounts': { label: 'modules.accountMaster', parent: 'modules.master' },
  '/items': { label: 'modules.itemMaster', parent: 'modules.master' },
  '/narrations': { label: 'modules.narrationMaster', parent: 'modules.master' },
  '/dangar-master': { label: 'modules.dangarMaster', parent: 'modules.master' },
  '/dangar-entry': { label: 'modules.dangarEntry', parent: 'modules.dangar' },
  '/dangar-rates': { label: 'modules.yearlyRateMaster', parent: 'modules.dangar' },
  '/kapat': { label: 'modules.kapatConsole', parent: 'modules.dangar' },
  '/bardan-portfolio': { label: 'modules.bardanPortfolio', parent: 'modules.dangar' },
  '/interest-calculator': { label: 'modules.interestCalculator', parent: 'modules.dangar' },
  '/dangar-payment-report': { label: 'modules.paymentReport', parent: 'modules.dangar' },
  '/dangar-summary': { label: 'modules.dangarSummary', parent: 'modules.dangar' },
  '/jama-bardan-entry': { label: 'modules.jamaBardanEntry', parent: 'modules.dangar' },
  '/sales': { label: 'modules.sale', parent: 'modules.transactions' },
  '/sales-return': { label: 'modules.saleReturn', parent: 'modules.transactions' },
  '/purchase': { label: 'modules.purchase', parent: 'modules.transactions' },
  '/purchase-return': { label: 'modules.purchaseReturn', parent: 'modules.transactions' },
  '/barcode': { label: 'modules.barcode', parent: 'modules.transactions' },
  '/rates': { label: 'modules.itemRate', parent: 'modules.transactions' },
  '/rojmel': { label: 'modules.rojmel', parent: 'modules.transactions' },
  '/cashbook': { label: 'modules.rojmel', parent: 'modules.transactions' },
  '/ledger': { label: 'modules.accountLedger', parent: 'modules.reports' },
  '/sabhasad-ledger': { label: 'modules.sabhasadLedger', parent: 'modules.reports' },
  '/bardan-report': { label: 'modules.bardanReport', parent: 'modules.reports' },
  '/ledger-report': { label: 'modules.ledgerAudit', parent: 'modules.reports' },
  '/profit-loss': { label: 'modules.profitAndLoss', parent: 'modules.reports' },
  '/stock': { label: 'modules.stockReport', parent: 'modules.reports' },
  '/sale-report': { label: 'modules.saleReport', parent: 'modules.reports' },
  '/purchase-report': { label: 'modules.purchaseReport', parent: 'modules.reports' },
  '/company': { label: 'modules.company', parent: 'modules.settings' },
  '/users': { label: 'modules.userMaster', parent: 'modules.settings' },
  '/settings': { label: 'modules.database', parent: 'modules.settings' },
};

function TopNavbar() {
  const location = useLocation();
  const { t } = useTranslation();
  
  // Clean up path
  const currentPath = location.pathname;
  let pageInfo = ROUTE_MAP[currentPath];
  
  // If it's a dynamic route like /dangar-entry/:id
  if (!pageInfo) {
    const baseRoute = Object.keys(ROUTE_MAP).find(route => currentPath.startsWith(route) && route !== '/');
    if (baseRoute) {
      pageInfo = ROUTE_MAP[baseRoute];
    }
  }

  // Hide TopNavbar if route isn't mapped
  if (!pageInfo) return null;

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 sticky top-0 z-30 shadow-sm select-none">
      <div className="flex flex-col justify-center">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
          <Link to="/dashboard" className="hover:text-[#1d5f84] transition flex items-center gap-1 cursor-pointer">
             <Home size={10} />
             <span>{t('modules.dashboard')}</span>
          </Link>
          {pageInfo.parent && (
            <>
              <ChevronRight size={10} className="text-slate-300" />
              <span className="text-slate-500">{t(pageInfo.parent)}</span>
            </>
          )}
          {pageInfo.label !== 'modules.dashboard' && (
             <>
               <ChevronRight size={10} className="text-slate-300" />
               <span className="text-[#1d5f84]">{t(pageInfo.label)}</span>
             </>
          )}
        </nav>
        {/* Page Title */}
        <h1 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">
          {t(pageInfo.label)}
        </h1>
      </div>
    </div>
  );
}

export default function Layout({ backendStatus }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Sidebar (currently Navbar.jsx) */}
      <Navbar backendStatus={backendStatus} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopNavbar />
        <div className="flex-1 overflow-y-auto relative">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ReportsHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const reports = [
    {
      title: t('modules.accountLedger', 'Account Ledger'),
      description: 'See a list of account ledgers. Monitor daily transactions.',
      path: '/ledger'
    },
    {
      title: t('modules.sabhasadLedger', 'Sabhasad Ledger'),
      description: 'Analyze sabhasad ledgers and financial performance.',
      path: '/sabhasad-ledger'
    },
    {
      title: t('modules.bardanReport', 'Bardan Report'),
      description: 'Review Dangar entry Bardan jama records and itemized bag weights.',
      path: '/bardan-report'
    },
    {
      title: t('modules.ledgerAudit', 'Ledger Audit'),
      description: 'Review ledger audits and verify accounting records.',
      path: '/ledger-report'
    },
    {
      title: t('modules.profitAndLoss', 'Profit & Loss'),
      description: 'View the profitability statement and fiscal health.',
      path: '/profit-loss'
    },
    {
      title: t('modules.stockReport', 'Stock Report'),
      description: 'Track inventory, stock movements, and current balances.',
      path: '/stock'
    },
    {
      title: t('modules.saleReport', 'Sale Report'),
      description: 'Comprehensive report on sales manifestations and volume.',
      path: '/sale-report'
    },
    {
      title: t('modules.purchaseReport', 'Purchase Report'),
      description: 'Detailed analysis of procurement and purchase activities.',
      path: '/purchase-report'
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Main White Panel */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-md p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {reports.map((report, idx) => (
            <div key={idx} className="flex flex-col items-start">
              <button
                onClick={() => navigate(report.path)}
                className="text-blue-600 font-semibold text-sm hover:underline text-left mb-1"
              >
                {report.title}
              </button>
              <p className="text-xs text-slate-500 font-medium">
                {report.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

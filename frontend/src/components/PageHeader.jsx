import React from 'react';

/**
 * PageHeader — reusable header that matches the project design system.
 *
 * Props:
 *  - eyebrow      : string  — small label above the title (e.g. "Management / Village Master")
 *  - eyebrowIcon  : node    — Lucide icon element rendered before the eyebrow text
 *  - title        : string  — main bold italic uppercase heading
 *  - subtitle     : string  — tiny muted text below the title
 *  - children     : node    — right-side slot for action buttons / controls
 *
 * Usage:
 *  <PageHeader
 *    eyebrow="Financial Intelligence / Payout Analytics"
 *    eyebrowIcon={<TrendingUp size={12} />}
 *    title="Dangar Payment Report"
 *    subtitle="Audit-Ready Manifest · Fiscal 2026-27"
 *  >
 *    <button ...>Export</button>
 *  </PageHeader>
 */
const PageHeader = ({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-10 pb-6 gap-6">
      {/* Left — Title block */}
      <div className="space-y-1">
        {(eyebrow || eyebrowIcon) && (
          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1 italic">
            {eyebrowIcon && <span className="shrink-0">{eyebrowIcon}</span>}
            {eyebrow && <span>{eyebrow}</span>}
          </div>
        )}

        <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none italic uppercase">
          {title}
        </h1>

        {subtitle && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right — Action slot */}
      {children && (
        <div className="flex items-center gap-3 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;

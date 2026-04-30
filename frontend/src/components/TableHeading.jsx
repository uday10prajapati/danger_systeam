import React from 'react';

/**
 * TableHeading — reusable header bar for the white card table section.
 *
 * Props:
 *  - icon       : ReactNode  — Lucide icon element shown in the coloured pill
 *  - iconColor  : string     — Tailwind color key for the pill (default 'blue')
 *  - title      : string     — bold table section title
 *  - subtitle   : string     — optional muted sub-label
 *  - count      : number     — optional record count badge shown next to title
 *  - children   : ReactNode  — right-side slot (filter pills, tab buttons, selects…)
 *
 * Usage:
 *  <TableHeading
 *    icon={<Database size={18} />}
 *    iconColor="blue"
 *    title="Operational Registry"
 *    subtitle="Showing all active ledger nodes"
 *    count={filteredAccounts.length}
 *  >
 *    <TabPills ... />
 *  </TableHeading>
 */
const TableHeading = ({
  icon,
  iconColor = 'blue',
  title,
  subtitle,
  count,
  children,
}) => {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald:'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber:  'bg-amber-50 text-amber-600',
    rose:   'bg-rose-50 text-rose-600',
    slate:  'bg-slate-100 text-slate-600',
  };
  const pill = colorMap[iconColor] || colorMap.blue;

  return (
    <div className="px-8 py-5 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white">
      {/* Left — Icon + title block */}
      <div className="flex items-center gap-4">
        {icon && (
          <div className={`p-2.5 rounded-lg shrink-0 ${pill}`}>
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              {title}
            </h2>
            {count !== undefined && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black">
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right — filters / tab pills slot */}
      {children && (
        <div className="flex items-center gap-2 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
};

export default TableHeading;

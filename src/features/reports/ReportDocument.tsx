import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import type { ReportSummary } from '../../types/reports'
import { formatCurrency } from '../../lib/utils'

const fontFamily = "'Roboto', 'Helvetica Neue', Arial, sans-serif"

interface ReportRow {
  label: string
  value: string
  details: string
}

function buildRows(report: ReportSummary): ReportRow[] {
  return [
    {
      label: 'Sales Report',
      value: String(report.sales_count),
      details: `Revenue: ${formatCurrency(report.sales_total)}`,
    },
    {
      label: 'Revenue Report',
      value: formatCurrency(report.sales_total),
      details: `Net profit: ${formatCurrency(report.net_profit)}`,
    },
    {
      label: 'Expenses Report',
      value: formatCurrency(report.expenses_total),
      details: `Net profit: ${formatCurrency(report.net_profit)}`,
    },
    {
      label: 'Credit Report',
      value: formatCurrency(report.credit_outstanding),
      details: `Collected in range: ${formatCurrency(report.credit_collected)}`,
    },
    {
      label: 'Inventory Report',
      value: String(report.products_total),
      details: `Value: ${formatCurrency(report.inventory_value)} · Low stock: ${report.low_stock_count}`,
    },
  ]
}

interface ReportDocumentProps {
  report: ReportSummary
  scopeLabel: string
  dateLabel: string
  generatedAt: string
}

export function ReportDocumentContent({ report, scopeLabel, dateLabel, generatedAt }: ReportDocumentProps) {
  const rows = buildRows(report)
  return (
    <div style={{ fontFamily, color: '#0f172a', width: '100%' }}>
      <div style={{ textAlign: 'center', paddingBottom: 12, borderBottom: '2px solid #0f172a' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.4 }}>{scopeLabel}</div>
        <div style={{ fontSize: 13, color: '#475569', marginTop: 4, fontWeight: 600, letterSpacing: 3 }}>
          BUSINESS REPORT
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#475569',
          marginTop: 10,
          gap: 12,
        }}
      >
        <span>Period: {dateLabel}</span>
        <span>Generated: {generatedAt}</span>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>
              Report
            </th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
              Value
            </th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>
              Details
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '9px 10px', fontWeight: 600 }}>{row.label}</td>
              <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700 }}>{row.value}</td>
              <td style={{ padding: '9px 10px', color: '#475569' }}>{row.details}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px solid #e2e8f0', margin: '16px 0 10px' }} />
      <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
        Inventory value is valued at current selling price. Reversed sales are excluded from revenue.
      </div>
    </div>
  )
}

export function ReportPrintArea({
  report,
  scopeLabel,
  dateLabel,
  generatedAt,
}: ReportDocumentProps): ReactNode {
  return createPortal(
    <div className="report-print-area">
      <ReportDocumentContent report={report} scopeLabel={scopeLabel} dateLabel={dateLabel} generatedAt={generatedAt} />
    </div>,
    document.body,
  )
}

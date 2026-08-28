import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import type { SaleDetail } from '../../types/sales'
import { PAYMENT_METHOD_LABELS } from '../../types/sales'
import type { ShopRecord } from '../../types/shops'
import { formatCurrency, formatDateTime } from '../../lib/utils'

interface ReceiptSheetProps {
  sale: SaleDetail
  shop: ShopRecord | null
  forPrint?: boolean
}

const fontFamily = "'Roboto', 'Helvetica Neue', Arial, sans-serif"

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 0',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#475569' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function TotalsRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 0',
        fontSize: bold ? 15 : 13,
      }}
    >
      <span style={{ color: '#475569', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function ReceiptContent({ sale, shop }: ReceiptSheetProps) {
  const contact = [shop?.phone, shop?.email].filter(Boolean).join('  •  ')
  const totalUnits = sale.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div style={{ fontFamily, color: '#0f172a', width: '100%' }}>
      <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '2px solid #0f172a' }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.4 }}>
          {shop?.name ?? 'Business'}
        </div>
        {contact && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{contact}</div>}
        {shop?.address && <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{shop.address}</div>}
      </div>

      <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 4,
            color: '#475569',
          }}
        >
          SALES RECEIPT
        </span>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0 12px' }} />

      <div style={{ maxWidth: 340, margin: '0 auto' }}>
        <MetaRow label="Receipt No." value={sale.receipt_number} />
        <MetaRow label="Date & Time" value={formatDateTime(sale.created_at)} />
        <MetaRow label="Payment Method" value={PAYMENT_METHOD_LABELS[sale.payment_method]} />
        <MetaRow label="Customer" value={sale.customer_name ?? (sale.customer_id ? 'Customer on file' : 'Walk-in / Guest')} />
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>#</th>
            <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Item</th>
            <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Qty</th>
            <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Unit Price</th>
            <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '7px 8px', color: '#64748b' }}>{index + 1}</td>
              <td style={{ padding: '7px 8px' }}>{item.product_name}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>
                {formatCurrency(item.total_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 6 }}>
        <MetaRow label="Item Count" value={`${sale.items.length} line${sale.items.length === 1 ? '' : 's'} · ${totalUnits} unit${totalUnits === 1 ? '' : 's'}`} />
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0' }} />

      <div style={{ maxWidth: 280, marginLeft: 'auto' }}>
        <TotalsRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
        <TotalsRow label="Total" value={formatCurrency(sale.total)} bold />
        <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
        <TotalsRow label="Amount Paid" value={formatCurrency(sale.amount_paid)} />
        {sale.remaining_credit > 0 && (
          <TotalsRow
            label="Remaining Credit"
            value={formatCurrency(sale.remaining_credit)}
            bold
          />
        )}
      </div>

      {sale.remaining_credit <= 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#16a34a', marginTop: 8 }}>
          Fully paid — no outstanding balance.
        </div>
      )}

      <div style={{ borderTop: '1px solid #e2e8f0', margin: '14px 0 10px' }} />

      <div style={{ textAlign: 'center', fontSize: 12, color: '#475569' }}>
        {shop?.receipt_footer ?? 'Thank you for your patronage!'}
      </div>
    </div>
  )
}

export default function ReceiptSheet({ sale, shop, forPrint }: ReceiptSheetProps) {
  if (forPrint) {
    return createPortal(
      <div className="receipt-print-area">
        <ReceiptContent sale={sale} shop={shop} />
      </div>,
      document.body,
    )
  }

  return (
    <div
      id="receipt-view"
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '36px 40px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
      }}
    >
      <ReceiptContent sale={sale} shop={shop} />
    </div>
  )
}
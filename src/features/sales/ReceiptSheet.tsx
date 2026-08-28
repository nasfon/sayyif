import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import type { SaleDetail } from '../../types/sales'
import { PAYMENT_METHOD_LABELS } from '../../types/sales'
import type { ShopRecord } from '../../types/shops'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import logo from '../../assets/logo.png'
import Phone from '@mui/icons-material/Phone'
import LocationOn from '@mui/icons-material/LocationOn'
import EmailOutlined from '@mui/icons-material/EmailOutlined'
import ReceiptLong from '@mui/icons-material/ReceiptLong'
import Person from '@mui/icons-material/Person'
import CreditCard from '@mui/icons-material/CreditCard'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import Schedule from '@mui/icons-material/Schedule'

interface ReceiptSheetProps {
  sale: SaleDetail
  shop: ShopRecord | null
  forPrint?: boolean
}

const NAVY = '#082868'
const NAVY_DARK = '#051a45'
const NAVY_TINT = '#eef2f6'
const NAVY_BORDER = '#c9d0de'
const TEXT_DARK = '#0f1a2b'
const MUTED = '#4a5b6e'
const BOX_BG = '#f5f8fc'
const CREDIT = '#b12e2e'
const CREDIT_BG = '#fcf2f2'
const CREDIT_BORDER = '#fad5d5'

const COMPANY = 'SAYYIF PREMIUM FLOUR MASTERS LTD'

const fontFamily =
  "'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"

function Icon({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: 18,
        color: NAVY,
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  )
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 13,
        padding: '4px 0',
        borderBottom: `1px dashed ${NAVY_BORDER}`,
      }}
    >
      <span style={{ color: MUTED, fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 600, color: TEXT_DARK }}>{value}</span>
    </div>
  )
}

function TotalLine({
  label,
  value,
  grand,
  credit,
}: {
  label: string
  value: string
  grand?: boolean
  credit?: boolean
}) {
  if (credit) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          marginTop: 8,
          background: CREDIT_BG,
          borderRadius: 30,
          padding: '6px 14px',
          marginLeft: -8,
          marginRight: -8,
          border: `1px solid ${CREDIT_BORDER}`,
        }}
      >
        <span style={{ color: CREDIT, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon>
            <CreditCard style={{ fontSize: 14, color: CREDIT }} />
          </Icon>
          {label}
        </span>
        <span style={{ color: CREDIT, fontWeight: 700 }}>{value}</span>
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: grand ? '6px 0' : '4px 0',
        fontSize: grand ? 18 : 14,
        fontWeight: grand ? 700 : 600,
        color: grand ? NAVY_DARK : TEXT_DARK,
        borderTop: grand ? `2px solid ${NAVY_BORDER}` : undefined,
        marginTop: grand ? 4 : undefined,
        paddingTop: grand ? 8 : undefined,
      }}
    >
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function ReceiptContent({ sale, shop }: ReceiptSheetProps) {
  const companyName = shop?.name ?? COMPANY
  const contact = [shop?.phone, shop?.email].filter(Boolean).join('  •  ')
  const totalUnits = sale.items.reduce((sum, item) => sum + item.quantity, 0)
  const customerName = sale.customer_name ?? (sale.customer_id ? 'Customer on file' : 'Walk-in / Guest')

  return (
    <div
      className="ims-receipt"
      style={{
        width: '100%',
        maxWidth: '210mm',
        minHeight: '297mm',
        boxSizing: 'border-box',
        background: '#ffffff',
        borderRadius: 18,
        padding: '30px 28px',
        fontFamily,
        color: TEXT_DARK,
        position: 'relative',
      }}
    >
      <style>{`
        .ims-receipt * { box-sizing: border-box; }
        @media print {
          body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
          .ims-receipt {
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            padding: 20px 22px !important;
          }
        }
        @media (max-width: 700px) {
          .ims-receipt { padding: 20px 16px !important; }
          .ims-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .ims-badge { align-self: flex-start !important; }
          .ims-meta-row { flex-direction: column !important; }
          .ims-totals-box { justify-content: stretch !important; }
          .ims-totals-card { width: 100% !important; }
        }
      `}</style>

      {/* HEADER */}
      <div
        className="ims-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: `2px solid ${NAVY_TINT}`,
          paddingBottom: 18,
          marginBottom: 22,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: '#ffffff',
              border: `1px solid ${NAVY_BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
              boxShadow: `0 6px 12px rgba(8, 40, 104, 0.12)`,
            }}
          >
            <img src={logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, letterSpacing: -0.3 }}>
              {companyName}
            </div>
            {shop?.phone && (
              <div style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <Icon>
                  <Phone style={{ fontSize: 14 }} />
                </Icon>
                {shop.phone}
              </div>
            )}
            {shop?.address && (
              <div style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Icon>
                  <LocationOn style={{ fontSize: 14 }} />
                </Icon>
                {shop.address}
              </div>
            )}
            {shop?.email && (
              <div style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Icon>
                  <EmailOutlined style={{ fontSize: 14 }} />
                </Icon>
                {shop.email}
              </div>
            )}
          </div>
        </div>
        <div
          className="ims-badge"
          style={{
            background: NAVY_TINT,
            color: NAVY,
            padding: '8px 18px',
            borderRadius: 40,
            fontWeight: 600,
            fontSize: 14,
            border: `1px solid ${NAVY_BORDER}`,
            boxShadow: 'inset 0 1px 2px #ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <ReceiptLong style={{ fontSize: 16 }} />
          RECEIPT #{sale.receipt_number}
        </div>
      </div>

      {/* CUSTOMER + META */}
      <div
        className="ims-meta-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px 10px',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            background: BOX_BG,
            borderRadius: 18,
            padding: '16px 20px',
            flex: '2 1 200px',
            border: `1px solid ${NAVY_BORDER}`,
          }}
        >
          <div
            style={{
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              color: MUTED,
              marginBottom: 8,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon>
              <Person style={{ fontSize: 15 }} />
            </Icon>
            Customer
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: NAVY }}>{customerName}</div>
          {contact && (
            <div style={{ fontSize: 14, color: TEXT_DARK, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Icon>
                <Phone style={{ fontSize: 14 }} />
              </Icon>
              {contact}
            </div>
          )}
        </div>
        <div
          style={{
            background: '#fafcff',
            borderRadius: 18,
            padding: '12px 18px',
            flex: '1 1 140px',
            border: `1px solid ${NAVY_BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <MetaItem label="Receipt No." value={sale.receipt_number} />
          <MetaItem label="Date" value={formatDateTime(sale.created_at)} />
          <MetaItem label="Payment" value={PAYMENT_METHOD_LABELS[sale.payment_method]} />
        </div>
      </div>

      {/* ITEMS */}
      <div style={{ margin: '10px 0 18px' }}>
        <div style={{ borderRadius: 18, border: `1px solid ${NAVY_BORDER}`, overflow: 'hidden', background: '#fafdff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: NAVY_TINT }}>
                <th style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600, color: NAVY, width: 40 }}>#</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 600, color: NAVY }}>Item name</th>
                <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 600, color: NAVY }}>Qty</th>
                <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 600, color: NAVY }}>Unit price</th>
                <th style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 600, color: NAVY }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: `1px solid #e9eef6` }}>
                  <td style={{ padding: '14px 12px', textAlign: 'center', color: MUTED }}>{index + 1}</td>
                  <td style={{ padding: '14px 12px' }}>{item.product_name}</td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                  <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 600, color: NAVY_DARK }}>
                    {formatCurrency(item.total_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOTALS */}
      <div className="ims-totals-box" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <div
          className="ims-totals-card"
          style={{
            background: BOX_BG,
            borderRadius: 20,
            padding: '18px 28px 20px',
            minWidth: 210,
            border: `1px solid ${NAVY_BORDER}`,
            boxShadow: `0 2px 8px rgba(8, 40, 104, 0.04)`,
          }}
        >
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>
            {sale.items.length} line{sale.items.length === 1 ? '' : 's'} · {totalUnits} unit{totalUnits === 1 ? '' : 's'}
          </div>
          <TotalLine label="Subtotal" value={formatCurrency(sale.subtotal)} />
          <TotalLine label="Total" value={formatCurrency(sale.total)} grand />
          <TotalLine label="Amount Paid" value={formatCurrency(sale.amount_paid)} />
          {sale.remaining_credit > 0 && (
            <TotalLine label="Remaining Credit" value={formatCurrency(sale.remaining_credit)} credit />
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          marginTop: 18,
          fontSize: 11,
          color: '#6b7c91',
          textAlign: 'center',
          borderTop: `1px solid ${NAVY_BORDER}`,
          paddingTop: 16,
          letterSpacing: 0.2,
        }}
      >
        <CheckCircleOutlined style={{ fontSize: 13, color: NAVY, marginRight: 4, verticalAlign: 'middle' }} />
        {shop?.receipt_footer ?? 'Thank you for your patronage!'}
        <span style={{ margin: '0 6px', color: NAVY }}>•</span>
        <Schedule style={{ fontSize: 13, color: NAVY, marginRight: 4, verticalAlign: 'middle' }} />
        {COMPANY}
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
    <div id="receipt-view">
      <ReceiptContent sale={sale} shop={shop} />
    </div>
  )
}

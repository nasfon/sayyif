import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { formatCurrency, formatDateTime } from '../../../lib/utils'
import { PAYMENT_METHOD_LABELS, type SaleDetail } from '../../../types/sales'
import type { ShopRecord } from '../../../types/shops'

function TicketRow({ label, value, bold }: { label: string; value: ReactNode; bold?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        py: 0.5,
      }}
    >
      <Typography
        variant="body2"
        color={bold ? 'text.primary' : 'text.secondary'}
        sx={{ fontWeight: bold ? 600 : 400 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  )
}

export default function MobileTicket({ sale, shop }: { sale: SaleDetail; shop: ShopRecord | null }) {
  const contact = [shop?.phone, shop?.email].filter(Boolean).join('  •  ')
  const totalUnits = sale.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Box sx={{ color: '#0f172a', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      <Box sx={{ textAlign: 'center', pb: 1.5, borderBottom: '2px solid #0f172a' }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.4 }}>{shop?.name ?? 'Business'}</Typography>
        {contact && (
          <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 0.5 }}>
            {contact}
          </Typography>
        )}
        {shop?.address && (
          <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
            {shop.address}
          </Typography>
        )}
      </Box>

      <Box sx={{ textAlign: 'center', py: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 4, color: '#475569' }}>
          SALES RECEIPT
        </Typography>
      </Box>

      <Box sx={{ borderTop: '1px dashed #cbd5e1', my: 1 }} />

      <TicketRow label="Receipt No." value={sale.receipt_number} />
      <TicketRow label="Date & Time" value={formatDateTime(sale.created_at)} />
      <TicketRow label="Payment Method" value={PAYMENT_METHOD_LABELS[sale.payment_method]} />
      <TicketRow
        label="Customer"
        value={sale.customer_name ?? (sale.customer_id ? 'Customer on file' : 'Walk-in / Guest')}
      />

      <Box sx={{ borderTop: '1px dashed #cbd5e1', my: 1 }} />

      {sale.items.map((item) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1.5,
            py: 1,
            borderBottom: '1px dashed #e2e8f0',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {item.quantity} × {formatCurrency(item.unit_price)}
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
            {formatCurrency(item.total_price)}
          </Typography>
        </Box>
      ))}

      <Box sx={{ borderTop: '1px dashed #cbd5e1', my: 1 }} />

      <TicketRow
        label="Items"
        value={`${sale.items.length} line${sale.items.length === 1 ? '' : 's'} · ${totalUnits} unit${
          totalUnits === 1 ? '' : 's'
        }`}
      />
      <TicketRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
      <TicketRow label="Total" value={formatCurrency(sale.total)} bold />
      <TicketRow label="Amount Paid" value={formatCurrency(sale.amount_paid)} />
      {sale.remaining_credit > 0 ? (
        <TicketRow label="Remaining Credit" value={formatCurrency(sale.remaining_credit)} bold />
      ) : (
        <Typography
          variant="caption"
          sx={{ color: '#16a34a', textAlign: 'center', display: 'block', mt: 0.5 }}
        >
          Fully paid — no outstanding balance.
        </Typography>
      )}

      <Box sx={{ borderTop: '1px dashed #cbd5e1', my: 1 }} />

      <Typography
        variant="caption"
        sx={{ color: '#475569', textAlign: 'center', display: 'block' }}
      >
        {shop?.receipt_footer ?? 'Thank you for your patronage!'}
      </Typography>
    </Box>
  )
}

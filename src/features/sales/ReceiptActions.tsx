import { useState } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Image from '@mui/icons-material/Image'
import PictureAsPdf from '@mui/icons-material/PictureAsPdf'
import Print from '@mui/icons-material/Print'
import ShareIcon from '@mui/icons-material/Share'
import WhatsApp from '@mui/icons-material/WhatsApp'
import Email from '@mui/icons-material/Email'
import IosShare from '@mui/icons-material/IosShare'
import { downloadReceiptImage } from '../../lib/receiptImage'
import { downloadReceiptPdf } from '../../lib/receiptPdf'
import { buildReceiptText, shareReceiptImageFile } from '../../lib/shareReceipt'
import type { SaleDetail } from '../../types/sales'

interface ReceiptActionsProps {
  sale: SaleDetail
  shopName?: string | null
}

export default function ReceiptActions({ sale, shopName }: ReceiptActionsProps) {
  const [pending, setPending] = useState<'pdf' | 'image' | 'share' | null>(null)
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null)

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async (kind: 'pdf' | 'image') => {
    setPending(kind)
    try {
      if (kind === 'pdf') {
        await downloadReceiptPdf(sale)
      } else {
        await downloadReceiptImage(sale.receipt_number)
      }
    } finally {
      setPending(null)
    }
  }

  const shareWhatsApp = async () => {
    setShareAnchor(null)
    setPending('share')
    try {
      const shared = await shareReceiptImageFile(sale, shopName)
      if (!shared) {
        const text = buildReceiptText(sale, shopName)
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
      }
    } catch {
      // user cancelled or sharing failed — ignore
    } finally {
      setPending(null)
    }
  }

  const shareEmail = async () => {
    setShareAnchor(null)
    setPending('share')
    try {
      const shared = await shareReceiptImageFile(sale, shopName)
      if (!shared) {
        const text = buildReceiptText(sale, shopName)
        const subject = `Receipt ${sale.receipt_number}`
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
      }
    } catch {
      // user cancelled or sharing failed — ignore
    } finally {
      setPending(null)
    }
  }

  const shareNative = async () => {
    setShareAnchor(null)
    setPending('share')
    try {
      const shared = await shareReceiptImageFile(sale, shopName)
      if (!shared && navigator.clipboard) {
        await navigator.clipboard.writeText(buildReceiptText(sale, shopName))
      }
    } catch {
      // user cancelled or sharing failed — ignore
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <Button size="small" startIcon={<Print />} onClick={handlePrint}>
        Print
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={pending === 'image' ? <CircularProgress size={16} /> : <Image />}
        onClick={() => handleDownload('image')}
        disabled={pending !== null}
      >
        Save Image
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={pending === 'pdf' ? <CircularProgress size={16} /> : <PictureAsPdf />}
        onClick={() => handleDownload('pdf')}
        disabled={pending !== null}
      >
        Download PDF
      </Button>
      <Button
        size="small"
        variant="contained"
        startIcon={pending === 'share' ? <CircularProgress size={16} /> : <ShareIcon />}
        onClick={(event) => setShareAnchor(event.currentTarget)}
        disabled={pending !== null}
      >
        Share
      </Button>
      <Menu anchorEl={shareAnchor} open={Boolean(shareAnchor)} onClose={() => setShareAnchor(null)}>
        <MenuItem onClick={shareWhatsApp}>
          <ListItemIcon>
            <WhatsApp fontSize="small" />
          </ListItemIcon>
          WhatsApp
        </MenuItem>
        <MenuItem onClick={shareEmail}>
          <ListItemIcon>
            <Email fontSize="small" />
          </ListItemIcon>
          Email
        </MenuItem>
        <MenuItem onClick={shareNative}>
          <ListItemIcon>
            <IosShare fontSize="small" />
          </ListItemIcon>
          More apps
        </MenuItem>
      </Menu>
    </>
  )
}

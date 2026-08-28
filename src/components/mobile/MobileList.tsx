import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'
import EmptyState from '../ui/EmptyState'

export interface MobileRowProps {
  primary: ReactNode
  secondary?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  accent?: 'success' | 'warning' | 'error' | 'default'
}

const ACCENT_COLOR: Record<NonNullable<MobileRowProps['accent']>, string> = {
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  default: 'divider',
}

export function MobileRow({
  primary,
  secondary,
  leading,
  trailing,
  onClick,
  accent = 'default',
}: MobileRowProps) {
  const inner = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
      {leading}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap variant="body1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
          {primary}
        </Typography>
        {secondary != null && (
          <Typography noWrap variant="body2" color="text.secondary">
            {secondary}
          </Typography>
        )}
      </Box>
      {trailing && (
        <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>{trailing}</Box>
      )}
    </Stack>
  )

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        borderLeft: `3px solid ${ACCENT_COLOR[accent]}`,
        '&:last-child': { mb: 0 },
      }}
    >
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ px: 2, py: 1.5 }}>
          {inner}
        </CardActionArea>
      ) : (
        <Box sx={{ px: 2, py: 1.5 }}>{inner}</Box>
      )}
    </Card>
  )
}

interface MobileListProps<T> {
  items: T[]
  getKey: (item: T) => string
  renderRow: (item: T) => ReactNode
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  skeletonCount?: number
}

export function MobileList<T>({
  items,
  getKey,
  renderRow,
  loading,
  emptyTitle,
  emptyDescription,
  hasMore,
  onLoadMore,
  loadingMore,
  skeletonCount = 6,
}: MobileListProps<T>) {
  if (loading && items.length === 0) {
    return (
      <Stack spacing={1.5}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card variant="outlined" key={i} sx={{ px: 2, py: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Skeleton width="60%" height={20} />
                <Skeleton width="40%" height={16} />
              </Box>
              <Skeleton width={56} height={20} />
            </Stack>
          </Card>
        ))}
      </Stack>
    )
  }

  if (!loading && items.length === 0) {
    return <EmptyState title={emptyTitle ?? 'Nothing here yet'} description={emptyDescription} />
  }

  return (
    <Box>
      {items.map((item) => (
        <Box key={getKey(item)}>{renderRow(item)}</Box>
      ))}
      {hasMore && (
        <Button
          fullWidth
          variant="outlined"
          onClick={onLoadMore}
          disabled={loadingMore}
          sx={{ mt: 1.5 }}
        >
          {loadingMore ? <CircularProgress size={20} /> : 'Load more'}
        </Button>
      )}
    </Box>
  )
}

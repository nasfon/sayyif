import Box from '@mui/material/Box'
import Construction from '@mui/icons-material/Construction'
import PageHeader from '../ui/PageHeader'
import EmptyState from '../ui/EmptyState'

interface PlaceholderPageProps {
  title: string
  description: string
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Box>
      <PageHeader title={title} subtitle={description} />
      <EmptyState
        icon={<Construction sx={{ fontSize: 48, color: 'text.secondary' }} />}
        title="Coming soon"
        description="This module will be available in a later phase of the MVP."
      />
    </Box>
  )
}
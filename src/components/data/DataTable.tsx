import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import EmptyState from '../ui/EmptyState'
import { features, type TableFeatures } from './table'

interface DataTableProps<T extends object> {
  columns: ColumnDef<TableFeatures, T, unknown>[]
  data: T[]
  getRowId?: (row: T) => string
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  defaultPageSize?: number
  rowCount?: number
  pagination?: PaginationState
  onPaginationChange?: (updaterOrValue: PaginationState | ((old: PaginationState) => PaginationState)) => void
  sorting?: SortingState
  onSortingChange?: (updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => void
}

export default function DataTable<T extends object>({
  columns,
  data,
  getRowId,
  loading,
  emptyTitle = 'No data',
  emptyDescription,
  defaultPageSize = 10,
  rowCount,
  pagination: controlledPagination,
  onPaginationChange,
  sorting: controlledSorting,
  onSortingChange,
}: DataTableProps<T>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  const sorting = controlledSorting ?? internalSorting
  const pagination = controlledPagination ?? internalPagination
  const handleSortingChange = onSortingChange ?? setInternalSorting
  const handlePaginationChange = onPaginationChange ?? setInternalPagination

  const table = useTable({
    features,
    columns,
    data,
    getRowId,
    state: { sorting, pagination },
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
  })

  const totalRows = rowCount ?? data.length
  const pageCount = Math.ceil(totalRows / pagination.pageSize)

  if (loading) {
    return <EmptyState title="Loading..." description="Please wait while data loads" />
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <TableSortLabel
                        active={header.column.getIsSorted() !== false}
                        direction={header.column.getIsSorted() === 'desc' ? 'desc' : 'asc'}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                      </TableSortLabel>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} hover>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {pageCount > 1 && (
        <TablePagination
          component="div"
          count={totalRows}
          rowsPerPage={pagination.pageSize}
          page={pagination.pageIndex}
          onPageChange={(_, page) => table.setPageIndex(page)}
          onRowsPerPageChange={(event) => table.setPageSize(Number(event.target.value))}
          rowsPerPageOptions={[10, 25, 50]}
        />
      )}
    </Paper>
  )
}
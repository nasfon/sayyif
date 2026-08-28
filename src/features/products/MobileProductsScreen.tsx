import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import Edit from '@mui/icons-material/Edit'
import {
  FilterChips,
  MobileRow,
  SearchBar,
  SwipeableRow,
  type SwipeAction,
} from '../../components/mobile'
import { ConfirmationDialog } from '../../components/ui'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { useShops } from '../../hooks/useShops'
import {
  useCreateProduct,
  useDeleteProduct,
  useInfiniteProductsList,
  useUpdateProduct,
} from '../../hooks/useProducts'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency } from '../../lib/utils'
import type { ProductRecord } from '../../types/products'
import type { CreateProductFormValues, EditProductFormValues } from './productsSchema'
import MobileProductFormSheet from './mobile/MobileProductFormSheet'

type StockFilter = 'all' | 'in_stock' | 'low' | 'out'

type DialogState = { type: 'create' } | { type: 'edit'; product: ProductRecord }

type ConfirmState = { product: ProductRecord; action: 'delete' } | null

const FILTER_OPTIONS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low', label: 'Low' },
  { value: 'out', label: 'Out' },
]

type StockStatus = 'inactive' | 'out' | 'low' | 'in_stock'

function getStockStatus(product: ProductRecord): { status: StockStatus; label: string; color: 'success' | 'warning' | 'error' | 'default' } {
  if (!product.is_active) return { status: 'inactive', label: 'Inactive', color: 'default' }
  if (product.quantity <= 0) return { status: 'out', label: 'Out', color: 'error' }
  if (product.quantity <= product.minimum_stock) return { status: 'low', label: 'Low', color: 'warning' }
  return { status: 'in_stock', label: 'In Stock', color: 'success' }
}

function matchesFilter(product: ProductRecord, filter: StockFilter): boolean {
  if (filter === 'all') return true
  return getStockStatus(product).status === filter
}

function ProductRow({ product }: { product: ProductRecord }) {
  const stock = getStockStatus(product)
  return (
    <MobileRow
      accent={
        stock.color === 'success'
          ? 'success'
          : stock.color === 'warning'
            ? 'warning'
            : stock.color === 'error'
              ? 'error'
              : 'default'
      }
      leading={
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: product.is_active ? 'success.main' : 'error.main',
            flexShrink: 0,
          }}
        />
      }
      primary={product.name}
      secondary={`SKU: ${product.sku}`}
      trailing={
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {formatCurrency(product.selling_price)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Qty: {product.quantity}
          </Typography>
        </Box>
      }
    />
  )
}

function getProductErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string }
  if (e.code === '23505' || (e.message ?? '').includes('duplicate key')) {
    return 'A product with this SKU already exists in this shop.'
  }
  return getApiErrorMessage(error)
}

export default function MobileProductsScreen() {
  const { profile } = useAuth()
  const permissions = usePermissions()
  const mobileNav = useMobileNav()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StockFilter>('all')
  const [shopId, setShopId] = useState('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isSuperAdmin = permissions.isSuperAdmin
  const canManage = permissions.canManageProducts
  const defaultShopId = isSuperAdmin ? shopId : (profile?.shop_id ?? '')

  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []

  const query = useInfiniteProductsList({ search, shopId: defaultShopId, status: '' })
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = query

  const rows = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.rows),
    [data],
  )
  const filteredRows = useMemo(() => rows.filter((row) => matchesFilter(row, filter)), [rows, filter])

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    mobileNav.setRefresh(() => refetch())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refetch])

  useEffect(() => {
    if (!canManage) {
      mobileNav.setFab(null)
      return
    }
    mobileNav.setFab({ icon: Add, onClick: () => setDialog({ type: 'create' }) })
    return () => mobileNav.setFab(null)
  }, [mobileNav, canManage])

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    hasNextPage && !isFetchingNextPage,
  )

  const closeDialog = () => {
    setDialog(null)
    setSubmitError(null)
  }

  const handleCreate = async (values: CreateProductFormValues) => {
    setSubmitError(null)
    try {
      await createProduct.mutateAsync({
        shop_id: values.shop_id,
        name: values.name,
        sku: values.sku,
        quantity: values.quantity,
        selling_price: values.selling_price,
        minimum_stock: values.minimum_stock,
      })
      closeDialog()
    } catch (error) {
      setSubmitError(getProductErrorMessage(error))
    }
  }

  const handleEdit = async (values: EditProductFormValues) => {
    if (dialog?.type !== 'edit') return
    setSubmitError(null)
    try {
      await updateProduct.mutateAsync({
        product_id: dialog.product.id,
        name: values.name,
        sku: values.sku,
        quantity: values.quantity,
        selling_price: values.selling_price,
        minimum_stock: values.minimum_stock,
        is_active: values.is_active,
      })
      closeDialog()
    } catch (error) {
      setSubmitError(getProductErrorMessage(error))
    }
  }

  const handleFormSubmit = async (values: CreateProductFormValues | EditProductFormValues) => {
    if (dialog?.type === 'edit') {
      await handleEdit(values as EditProductFormValues)
    } else {
      await handleCreate(values as CreateProductFormValues)
    }
  }

  const handleDelete = async (target: NonNullable<ConfirmState>) => {
    setActionError(null)
    try {
      await deleteProduct.mutateAsync(target.product.id)
      setConfirm(null)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
      setConfirm(null)
    }
  }

  const getActions = useCallback(
    (product: ProductRecord): SwipeAction[] => {
      if (!canManage) return []
      return [
        {
          key: 'edit',
          label: 'Edit',
          icon: Edit,
          color: 'primary',
          onClick: () => setDialog({ type: 'edit', product }),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: DeleteOutlined,
          color: 'error',
          onClick: () => setConfirm({ product, action: 'delete' }),
        },
      ]
    },
    [canManage],
  )

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or SKU" />
      </Box>
      <Box sx={{ mb: 1.5 }}>
        <FilterChips options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      </Box>
      {isSuperAdmin && (
        <Select
          value={shopId}
          onChange={(event: SelectChangeEvent<string>) => setShopId(event.target.value)}
          displayEmpty
          size="small"
          fullWidth
          sx={{ mb: 1.5 }}
        >
          <MenuItem value="">All shops</MenuItem>
          {shops.map((shop) => (
            <MenuItem key={shop.id} value={shop.id}>
              {shop.name}
            </MenuItem>
          ))}
        </Select>
      )}

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
              <Skeleton width="60%" height={20} />
              <Skeleton width="40%" height={16} />
            </Box>
          ))}
        </Stack>
      ) : filteredRows.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6">No products found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Try adjusting your search or filters.
          </Typography>
        </Box>
      ) : (
        <Box>
          {filteredRows.map((product) => (
            <SwipeableRow
              key={product.id}
              actions={getActions(product)}
              onClick={canManage ? () => setDialog({ type: 'edit', product }) : undefined}
            >
              <ProductRow product={product} />
            </SwipeableRow>
          ))}
          {hasNextPage && (
            <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              {isFetchingNextPage ? <CircularProgress size={24} /> : null}
            </Box>
          )}
        </Box>
      )}

      <MobileProductFormSheet
        key={dialog?.type === 'edit' ? dialog.product.id : 'create'}
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        mode={dialog?.type === 'edit' ? 'edit' : 'create'}
        product={dialog?.type === 'edit' ? dialog.product : undefined}
        shopOptions={shops}
        requireShopSelect={isSuperAdmin}
        defaultShopId={defaultShopId}
        isSubmitting={createProduct.isPending || updateProduct.isPending}
        submitError={submitError}
        onSubmit={handleFormSubmit}
        onClose={closeDialog}
      />

      <ConfirmationDialog
        open={confirm !== null}
        title="Delete product"
        message={
          confirm
            ? `Are you sure you want to delete ${confirm.product.name}? This will hide it from sales and lists. Its sale and stock history will be preserved.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteProduct.isPending}
        onConfirm={() => confirm && handleDelete(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  )
}

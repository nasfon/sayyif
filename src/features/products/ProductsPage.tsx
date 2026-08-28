import { lazy, Suspense, useEffect, useState } from 'react'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import Loading from '../../components/feedback/Loading'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import Block from '@mui/icons-material/Block'
import CheckCircle from '@mui/icons-material/CheckCircle'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import Edit from '@mui/icons-material/Edit'
import Search from '@mui/icons-material/Search'
import DataTable from '../../components/data/DataTable'
import { type TableFeatures } from '../../components/data/table'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import ConfirmationDialog from '../../components/ui/ConfirmationDialog'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { useShops } from '../../hooks/useShops'
import {
  useCreateProduct,
  useDeleteProduct,
  useProductsList,
  useUpdateProduct,
} from '../../hooks/useProducts'
import type {
  ProductRecord,
  ProductStatusFilter,
} from '../../types/products'
import ProductFormDialog from './ProductFormDialog'
import {
  type CreateProductFormValues,
  type EditProductFormValues,
} from './productsSchema'

const MobileProductsScreen = lazy(() => import('./MobileProductsScreen'))

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; product: ProductRecord }

type ConfirmState =
  | { product: ProductRecord; action: 'activate' | 'deactivate' | 'delete' }
  | null

function getProductErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string }
  if (e.code === '23505' || (e.message ?? '').includes('duplicate key')) {
    return 'A product with this SKU already exists in this shop.'
  }
  return getApiErrorMessage(error)
}

export default function ProductsPage() {
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile

  const { profile } = useAuth()
  const permissions = usePermissions()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('')
  const [shopFilter, setShopFilter] = useState('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isSuperAdmin = permissions.isSuperAdmin
  const isAdmin = permissions.canManageProducts
  const defaultShopId = isSuperAdmin ? '' : (profile?.shop_id ?? '')

  const productsQuery = useProductsList({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    status: statusFilter,
    shopId: isSuperAdmin ? shopFilter : defaultShopId,
  })
  const { data, isLoading, refetch: refetchProducts } = productsQuery
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const shopName = (shopId: string) => shops.find((shop) => shop.id === shopId)?.name ?? '—'

  useEffect(() => {
    if (isMobile) return
    mobileNav.setRefresh(() => refetchProducts())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refetchProducts, isMobile])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

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

  const handleToggleActive = async (target: NonNullable<ConfirmState>) => {
    setActionError(null)
    try {
      await updateProduct.mutateAsync({
        product_id: target.product.id,
        name: target.product.name,
        sku: target.product.sku,
        quantity: target.product.quantity,
        selling_price: target.product.selling_price,
        minimum_stock: target.product.minimum_stock,
        is_active: target.action === 'activate',
      })
      setConfirm(null)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
      setConfirm(null)
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

  const columns: ColumnDef<TableFeatures, ProductRecord, unknown>[] = []

  if (isSuperAdmin) {
    columns.push({
      accessorKey: 'shop_id',
      header: 'Shop',
      cell: (info) => <Typography variant="body2">{shopName(info.getValue<string>())}</Typography>,
    })
  }

  columns.push(
    {
      accessorKey: 'name',
      header: 'Product Name',
      cell: (info) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {info.getValue<string>()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {info.row.original.sku}
          </Typography>
        </Stack>
      ),
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: (info) => <Typography variant="body2">{info.getValue<number>()}</Typography>,
    },
    {
      accessorKey: 'selling_price',
      header: 'Selling Price',
      cell: (info) => <Typography variant="body2">{formatCurrency(info.getValue<number>())}</Typography>,
    },
    {
      accessorKey: 'minimum_stock',
      header: 'Minimum Stock',
      cell: (info) => <Typography variant="body2">{info.getValue<number>()}</Typography>,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: (info) => (
        <StatusBadge label={info.getValue<boolean>() ? 'Active' : 'Inactive'} color={info.getValue<boolean>() ? 'success' : 'default'} />
      ),
    },
  )

  if (isAdmin) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const row = info.row.original
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" startIcon={<Edit />} onClick={() => setDialog({ type: 'edit', product: row })}>
              Edit
            </Button>
            {row.is_active ? (
              <Button
                size="small"
                color="error"
                startIcon={<Block />}
                onClick={() => setConfirm({ product: row, action: 'deactivate' })}
              >
                Disable
              </Button>
            ) : (
              <Button
                size="small"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => setConfirm({ product: row, action: 'activate' })}
              >
                Enable
              </Button>
            )}
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlined />}
              onClick={() => setConfirm({ product: row, action: 'delete' })}
            >
              Delete
            </Button>
          </Stack>
        )
      },
    })
  }

  const confirmTitle = (state: NonNullable<ConfirmState>) => {
    switch (state.action) {
      case 'delete':
        return 'Delete product'
      case 'deactivate':
        return 'Disable product'
      case 'activate':
        return 'Enable product'
    }
  }

  const confirmMessage = (state: NonNullable<ConfirmState>) => {
    switch (state.action) {
      case 'delete':
        return `Are you sure you want to delete ${state.product.name}? This will hide it from sales and lists. Its sale and stock history will be preserved.`
      case 'deactivate':
        return `Are you sure you want to disable ${state.product.name}? It will no longer be available for new sales.`
      case 'activate':
        return `Are you sure you want to enable ${state.product.name}? It will be available for sales again.`
    }
  }

  const confirmLabel = (state: NonNullable<ConfirmState>) => {
    switch (state.action) {
      case 'delete':
        return 'Delete'
      case 'deactivate':
        return 'Disable'
      case 'activate':
        return 'Enable'
    }
  }

  return isMobile ? (
    <Suspense fallback={<Loading />}>
      <MobileProductsScreen />
    </Suspense>
  ) : (
    <Box>
      <PageHeader
        title="Products"
        subtitle="Manage inventory items across your shop"
        actions={
          isAdmin ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ type: 'create' })}>
              Add Product
            </Button>
          ) : undefined
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or SKU"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        {isSuperAdmin && (
          <Select
            value={shopFilter}
            onChange={(event: SelectChangeEvent<string>) => {
              setShopFilter(event.target.value)
              setPagination((prev) => ({ ...prev, pageIndex: 0 }))
            }}
            displayEmpty
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All shops</MenuItem>
            {shops.map((shop) => (
              <MenuItem key={shop.id} value={shop.id}>
                {shop.name}
              </MenuItem>
            ))}
          </Select>
        )}
        <Select
          value={statusFilter}
          onChange={(event: SelectChangeEvent<ProductStatusFilter>) => {
            setStatusFilter(event.target.value as ProductStatusFilter)
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }}
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </Select>
      </Stack>

      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

      <DataTable<ProductRecord>
        columns={columns}
        data={data?.rows ?? []}
        getRowId={(row) => row.id}
        loading={isLoading}
        rowCount={data?.count ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyTitle="No products found"
        emptyDescription="Try adjusting your search or filters."
      />

      <ProductFormDialog
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
        title={confirm ? confirmTitle(confirm) : ''}
        message={confirm ? confirmMessage(confirm) : ''}
        confirmLabel={confirm ? confirmLabel(confirm) : 'Confirm'}
        confirmColor={confirm?.action === 'activate' ? 'success' : 'error'}
        loading={updateProduct.isPending || deleteProduct.isPending}
        onConfirm={() => {
          if (!confirm) return
          if (confirm.action === 'delete') {
            handleDelete(confirm)
          } else {
            handleToggleActive(confirm)
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  )
}
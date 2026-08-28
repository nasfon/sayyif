import { z } from 'zod'

const productName = z
  .string()
  .trim()
  .min(1, 'Product name is required')
  .max(100, 'Product name must be 100 characters or fewer')

const sku = z
  .string()
  .trim()
  .min(1, 'SKU is required')
  .max(50, 'SKU must be 50 characters or fewer')

const quantity = z.coerce
  .number()
  .int('Quantity must be a whole number')
  .min(0, 'Quantity cannot be negative')

const sellingPrice = z.coerce
  .number()
  .positive('Selling price must be greater than 0')
  .max(99_999_999_999, 'Selling price is too large')

const minimumStock = z.coerce
  .number()
  .int('Minimum stock must be a whole number')
  .min(0, 'Minimum stock cannot be negative')

export const createProductSchema = z.object({
  shop_id: z.string().min(1, 'Shop is required'),
  name: productName,
  sku,
  quantity,
  selling_price: sellingPrice,
  minimum_stock: minimumStock,
})

export const editProductSchema = z.object({
  name: productName,
  sku,
  quantity,
  selling_price: sellingPrice,
  minimum_stock: minimumStock,
  is_active: z.boolean(),
})

export type CreateProductFormValues = z.infer<typeof createProductSchema>
export type EditProductFormValues = z.infer<typeof editProductSchema>
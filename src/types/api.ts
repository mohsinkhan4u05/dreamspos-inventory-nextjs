// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Product Types
export interface Product {
  id: string
  name: string
  description?: string
  sku: string
  barcode?: string
  categoryId: string
  brandId?: string
  storeId: string
  image?: string
  costPrice: number
  sellingPrice: number
  minPrice?: number
  maxPrice?: number
  reorderLevel?: number
  reorderQty?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  category?: {
    id: string
    name: string
  }
  brand?: {
    id: string
    name: string
  }
  store?: {
    id: string
    name: string
  }
}

export interface ProductCreateInput {
  name: string
  description?: string
  sku: string
  barcode?: string
  categoryId: string
  brandId?: string
  storeId: string
  image?: string
  costPrice: number
  sellingPrice: number
  minPrice?: number
  maxPrice?: number
  reorderLevel?: number
  reorderQty?: number
  isActive?: boolean
}

export interface ProductUpdateInput {
  name?: string
  description?: string
  sku?: string
  barcode?: string
  categoryId?: string
  brandId?: string
  storeId?: string
  image?: string
  costPrice?: number
  sellingPrice?: number
  minPrice?: number
  maxPrice?: number
  reorderLevel?: number
  reorderQty?: number
  isActive?: boolean
}

// Stock Types
export interface StockUpdateInput {
  quantity: number
  minStock?: number
  maxStock?: number
  batchNumber?: string
  expiryDate?: Date
}

// Sale Types
export interface SaleCreateInput {
  invoiceNumber: string
  customerId?: string
  sessionId: string
  storeId: string
  subtotal: number
  discount?: number
  taxAmount?: number
  totalAmount: number
  paidAmount: number
  dueAmount?: number
  notes?: string
  items: SaleItemCreateInput[]
}

export interface SaleItemCreateInput {
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  discount?: number
  taxAmount?: number
  totalPrice: number
}

// Purchase Types
export interface PurchaseCreateInput {
  orderNumber: string
  supplierId?: string
  storeId: string
  subtotal: number
  discount?: number
  taxAmount?: number
  totalAmount: number
  paidAmount: number
  dueAmount?: number
  expectedDate?: Date
  notes?: string
  items: PurchaseItemCreateInput[]
}

export interface PurchaseItemCreateInput {
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  discount?: number
  taxAmount?: number
  totalPrice: number
}

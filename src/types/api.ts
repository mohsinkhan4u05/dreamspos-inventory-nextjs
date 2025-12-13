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
  sku?: string
  barcode?: string
  brandId?: string
  image?: string
  costPrice: number
  sellingPrice: number
  minPrice?: number
  maxPrice?: number
  reorderLevel?: number
  reorderQty?: number
  isActive: boolean
  itemType?: "GOODS" | "SERVICE"
  unitId?: string
  returnable?: boolean
  length?: number
  width?: number
  height?: number
  dimensionUnit?: string
  weight?: number
  weightUnit?: string
  manufacturer?: string
  upc?: string
  ean?: string
  mpn?: string
  isbn?: string
  sellable?: boolean
  purchasable?: boolean
  salesDescription?: string
  purchaseDescription?: string
  preferredVendorId?: string
  salesAccount?: string
  purchaseAccount?: string
  inventoryAccount?: string
  inventoryValuation?: "FIFO"
  trackInventory?: boolean
  openingStock?: number
  openingStockRate?: number
  allowOpeningStockEdit?: boolean
  createdAt: Date
  updatedAt: Date
  brand?: {
    id: string
    name: string
  }
  unit?: {
    id: string
    name: string
    code: string
  }
  preferredVendor?: {
    id: string
    name: string
  }
}

export interface ProductCreateInput {
  name: string
  description?: string
  sku?: string
  barcode?: string
  brandId?: string
  image?: string
  costPrice: number
  sellingPrice: number
  minPrice?: number
  maxPrice?: number
  reorderLevel?: number
  reorderQty?: number
  isActive?: boolean
  itemType?: "GOODS" | "SERVICE"
  unitId?: string
  returnable?: boolean
  length?: number
  width?: number
  height?: number
  dimensionUnit?: string
  weight?: number
  weightUnit?: string
  manufacturer?: string
  upc?: string
  ean?: string
  mpn?: string
  isbn?: string
  sellable?: boolean
  purchasable?: boolean
  salesDescription?: string
  purchaseDescription?: string
  preferredVendorId?: string
  salesAccount?: string
  purchaseAccount?: string
  inventoryAccount?: string
  inventoryValuation?: "FIFO"
  trackInventory?: boolean
  openingStock?: number
  openingStockRate?: number
  allowOpeningStockEdit?: boolean
}

export interface ProductUpdateInput {
  name?: string
  description?: string
  sku?: string
  barcode?: string
  brandId?: string
  image?: string
  costPrice?: number
  sellingPrice?: number
  minPrice?: number
  maxPrice?: number
  reorderLevel?: number
  reorderQty?: number
  isActive?: boolean
  itemType?: "GOODS" | "SERVICE"
  unitId?: string
  returnable?: boolean
  length?: number
  width?: number
  height?: number
  dimensionUnit?: string
  weight?: number
  weightUnit?: string
  manufacturer?: string
  upc?: string
  ean?: string
  mpn?: string
  isbn?: string
  sellable?: boolean
  purchasable?: boolean
  salesDescription?: string
  purchaseDescription?: string
  preferredVendorId?: string
  salesAccount?: string
  purchaseAccount?: string
  inventoryAccount?: string
  inventoryValuation?: "FIFO"
  trackInventory?: boolean
  openingStock?: number
  openingStockRate?: number
  allowOpeningStockEdit?: boolean
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

// Organization Types
export interface OrganizationCustomField {
  label: string
  value: string
}

export interface OrganizationProfile {
  id: string
  name: string
  industry?: string | null
  location: string
  addressLine1: string
  addressLine2?: string | null
  city: string
  state: string
  zipCode: string
  websiteUrl?: string | null

  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone?: string | null

  baseCurrency: string
  fiscalYear: string
  language: string
  communicationLang: string
  timezone: string
  dateFormat: string
  companyId?: string | null

  logoUrl?: string | null

  customFields?: OrganizationCustomField[] | null

  createdAt: Date
  updatedAt: Date
}

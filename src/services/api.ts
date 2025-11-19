import { Product } from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Generic API fetch function
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}/api${endpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  
  const response = await fetch(url, {
    headers,
    credentials: 'include', // Include cookies for authentication
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Product API services
export const productService = {
  // Get all products with optional filtering
  async getProducts(params?: {
    page?: number
    limit?: number
    search?: string
    categoryId?: string
    brandId?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId)
    if (params?.brandId) searchParams.set('brandId', params.brandId)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())
    
    const query = searchParams.toString()
    return fetchAPI(`/inventory/products${query ? `?${query}` : ''}`)
  },

  // Get single product by ID
  async getProduct(id: string) {
    return fetchAPI(`/inventory/products/${id}`)
  },

  // Create new product
  async createProduct(productData: Partial<Product>) {
    return fetchAPI('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    })
  },

  // Update product
  async updateProduct(id: string, productData: Partial<Product>) {
    return fetchAPI(`/inventory/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    })
  },

  // Delete product
  async deleteProduct(id: string) {
    return fetchAPI(`/inventory/products/${id}`, {
      method: 'DELETE',
    })
  },
}

// Category API services
export const categoryService = {
  async getCategories(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())
    
    const query = searchParams.toString()
    return fetchAPI(`/inventory/categories${query ? `?${query}` : ''}`)
  },

  async createCategory(categoryData: Record<string, unknown>) {
    return fetchAPI('/inventory/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
  },
}

// Brand API services
export const brandService = {
  async getBrands(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())

    const query = searchParams.toString()
    return fetchAPI(`/inventory/brands${query ? `?${query}` : ''}`)
  },

  async createBrand(brandData: Record<string, unknown>) {
    return fetchAPI('/inventory/brands', {
      method: 'POST',
      body: JSON.stringify(brandData),
    })
  },

  async updateBrand(id: string, brandData: Record<string, unknown>) {
    return fetchAPI(`/inventory/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(brandData),
    })
  },

  async deleteBrand(id: string) {
    return fetchAPI(`/inventory/brands/${id}`, {
      method: 'DELETE',
    })
  },
}

// Unit API services
export const unitService = {
  async getUnits(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())

    const query = searchParams.toString()
    return fetchAPI(`/inventory/units${query ? `?${query}` : ''}`)
  },

  async createUnit(unitData: Record<string, unknown>) {
    return fetchAPI('/inventory/units', {
      method: 'POST',
      body: JSON.stringify(unitData),
    })
  },

  async updateUnit(id: string, unitData: Record<string, unknown>) {
    return fetchAPI(`/inventory/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(unitData),
    })
  },

  async deleteUnit(id: string) {
    return fetchAPI(`/inventory/units/${id}`, {
      method: 'DELETE',
    })
  },
}

// Supplier API services
export const supplierService = {
  async getSuppliers(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())

    const query = searchParams.toString()
    return fetchAPI(`/suppliers${query ? `?${query}` : ''}`)
  },

  async createSupplier(supplierData: Record<string, unknown>) {
    return fetchAPI('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    })
  },

  async updateSupplier(id: string, supplierData: Record<string, unknown>) {
    return fetchAPI(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData),
    })
  },

  async deleteSupplier(id: string) {
    return fetchAPI(`/suppliers/${id}`, {
      method: 'DELETE',
    })
  },
}

// Customer API services
export const customerService = {
  async getCustomers(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())

    const query = searchParams.toString()
    return fetchAPI(`/customers${query ? `?${query}` : ''}`)
  },

  async createCustomer(customerData: Record<string, unknown>) {
    return fetchAPI('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    })
  },

  async updateCustomer(id: string, customerData: Record<string, unknown>) {
    return fetchAPI(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    })
  },

  async deleteCustomer(id: string) {
    return fetchAPI(`/customers/${id}`, {
      method: 'DELETE',
    })
  },
}

// Biller API services
export const billerService = {
  async getBillers(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())

    const query = searchParams.toString()
    return fetchAPI(`/billers${query ? `?${query}` : ''}`)
  },

  async createBiller(billerData: Record<string, unknown>) {
    return fetchAPI('/billers', {
      method: 'POST',
      body: JSON.stringify(billerData),
    })
  },

  async updateBiller(id: string, billerData: Record<string, unknown>) {
    return fetchAPI(`/billers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(billerData),
    })
  },

  async deleteBiller(id: string) {
    return fetchAPI(`/billers/${id}`, {
      method: 'DELETE',
    })
  },
}

// Stock API services
export const stockService = {
  async getStocks(params?: {
    page?: number
    limit?: number
    search?: string
    storeId?: string
    warehouseId?: string
    productId?: string
    lowStock?: boolean
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.warehouseId) searchParams.set('warehouseId', params.warehouseId)
    if (params?.productId) searchParams.set('productId', params.productId)
    if (params?.lowStock) searchParams.set('lowStock', 'true')
    
    const query = searchParams.toString()
    return fetchAPI(`/inventory/stocks${query ? `?${query}` : ''}`)
  },

  async createStock(stockData: Record<string, unknown>) {
    return fetchAPI('/inventory/stocks', {
      method: 'POST',
      body: JSON.stringify(stockData),
    })
  },

  async updateStock(id: string, stockData: Record<string, unknown>) {
    return fetchAPI(`/inventory/stocks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stockData),
    })
  },

  async deleteStock(id: string) {
    return fetchAPI(`/inventory/stocks/${id}`, {
      method: 'DELETE',
    })
  },
}

// Sales API services
export const salesService = {
  async getSales(params?: {
    page?: number
    limit?: number
    storeId?: string
    startDate?: string
    endDate?: string
    status?: string
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.status) searchParams.set('status', params.status)
    
    const query = searchParams.toString()
    return fetchAPI(`/sales${query ? `?${query}` : ''}`)
  },

  async createSale(saleData: Record<string, unknown>) {
    return fetchAPI('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    })
  },
}

// Stock Adjustment API services
export const stockAdjustmentService = {
  async getStockAdjustments(params?: {
    page?: number
    limit?: number
    search?: string
    storeId?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.storeId) searchParams.set('storeId', params.storeId)

    const query = searchParams.toString()
    return fetchAPI(`/inventory/stock-adjustments${query ? `?${query}` : ''}`)
  },

  async createStockAdjustment(adjustmentData: Record<string, unknown>) {
    return fetchAPI('/inventory/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify(adjustmentData),
    })
  },

  async updateStockAdjustment(id: string, adjustmentData: Record<string, unknown>) {
    return fetchAPI(`/inventory/stock-adjustments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(adjustmentData),
    })
  },

  async deleteStockAdjustment(id: string) {
    return fetchAPI(`/inventory/stock-adjustments/${id}`, {
      method: 'DELETE',
    })
  },
}

// Purchase API services
export const purchaseService = {
  async getPurchases(params?: {
    page?: number
    limit?: number
    storeId?: string
    startDate?: string
    endDate?: string
    status?: string
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.status) searchParams.set('status', params.status)
    
    const query = searchParams.toString()
    return fetchAPI(`/purchases${query ? `?${query}` : ''}`)
  },

  async createPurchase(purchaseData: Record<string, unknown>) {
    return fetchAPI('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    })
  },
}

// Store API services
export const storeService = {
  async getStores(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())
    
    const query = searchParams.toString()
    return fetchAPI(`/stores${query ? `?${query}` : ''}`)
  },

  async createStore(storeData: Record<string, unknown>) {
    return fetchAPI('/stores', {
      method: 'POST',
      body: JSON.stringify(storeData),
    })
  },

  async updateStore(id: string, storeData: Record<string, unknown>) {
    return fetchAPI(`/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(storeData),
    })
  },

  async deleteStore(id: string) {
    return fetchAPI(`/stores/${id}`, {
      method: 'DELETE',
    })
  },
}

// Warehouse API services
export const warehouseService = {
  async getWarehouses(params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())

    const query = searchParams.toString()
    return fetchAPI(`/warehouses${query ? `?${query}` : ''}`)
  },

  async createWarehouse(warehouseData: Record<string, unknown>) {
    return fetchAPI('/warehouses', {
      method: 'POST',
      body: JSON.stringify(warehouseData),
    })
  },

  async updateWarehouse(id: string, warehouseData: Record<string, unknown>) {
    return fetchAPI(`/warehouses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(warehouseData),
    })
  },

  async deleteWarehouse(id: string) {
    return fetchAPI(`/warehouses/${id}`, {
      method: 'DELETE',
    })
  },
}

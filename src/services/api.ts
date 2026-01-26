import { Product } from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

type ErrorResponse = {
  error: string
}

function hasErrorMessage(data: unknown): data is ErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  )
}

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

  const contentType = response.headers.get('content-type')
  const isJson = contentType && contentType.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const messageFromJson = hasErrorMessage(data) ? data.error : undefined

    const message = messageFromJson || `API Error: ${response.status} ${response.statusText}`
    throw new Error(message)
  }

  return data
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
  async createProduct(
    productData: Partial<Product> & {
      variantOptions?: { name: string; values: string[]; position?: number }[]
      baseSkuPrefix?: string
      variantDetails?: {
        title: string
        costPrice: number
        sellingPrice: number
        quantity: number
      }[]
    },
  ) {
    return fetchAPI('/inventory/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    })
  },

  // Update product
  async updateProduct(
    id: string,
    productData: Partial<Product> & {
      variantUpdates?: {
        id?: string
        name?: string
        costPrice?: number
        sellingPrice?: number
        quantity?: number
      }[]
    },
  ) {
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

// Manufacturing - Production Order & BOM API services
export const productionOrderService = {
  async getProductionOrders(params?: {
    page?: number
    limit?: number
    storeId?: string
    status?: string
    finishedProductId?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set("page", params.page.toString())
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.storeId) searchParams.set("storeId", params.storeId)
    if (params?.status) searchParams.set("status", params.status)
    if (params?.finishedProductId)
      searchParams.set("finishedProductId", params.finishedProductId)

    const query = searchParams.toString()
    return fetchAPI(`/manufacturing/production-orders${query ? `?${query}` : ""}`)
  },

  async getProductionOrder(id: string) {
    return fetchAPI(`/manufacturing/production-orders/${id}`)
  },

  async createProductionOrder(data: Record<string, unknown>) {
    return fetchAPI("/manufacturing/production-orders", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async completeProductionOrder(id: string) {
    return fetchAPI(`/manufacturing/production-orders/${id}/complete`, {
      method: "POST",
    })
  },

  async cancelProductionOrder(id: string) {
    return fetchAPI(`/manufacturing/production-orders/${id}/cancel`, {
      method: "POST",
    })
  },
}

export const bomService = {
  async getBom(finishedProductId: string) {
    return fetchAPI(`/manufacturing/bom/${finishedProductId}`)
  },

  async saveBom(
    finishedProductId: string,
    items: Array<{
      rawMaterialId: string
      unitId: string
      quantityRequired: number
    }>,
  ) {
    return fetchAPI("/manufacturing/bom", {
      method: "POST",
      body: JSON.stringify({ finishedProductId, items }),
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

  async getSupplier(id: string) {
    return fetchAPI(`/suppliers/${id}`)
  },

  async getSupplierActivities(id: string, params?: { limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    const query = searchParams.toString()
    return fetchAPI(`/suppliers/${id}/activities${query ? `?${query}` : ''}`)
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

  async getCustomer(id: string) {
    return fetchAPI(`/customers/${id}`)
  },

  async getCustomerActivities(id: string, params?: { limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    const query = searchParams.toString()
    return fetchAPI(`/customers/${id}/activities${query ? `?${query}` : ''}`)
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
    search?: string
    saleId?: string
    storeId?: string
    startDate?: string
    endDate?: string
    status?: string
    paymentStatus?: string
    customerId?: string
  }) {
    const searchParams = new URLSearchParams()
    
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.saleId) searchParams.set('saleId', params.saleId)
    if (params?.customerId) searchParams.set('customerId', params.customerId)
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus)
    
    const query = searchParams.toString()
    return fetchAPI(`/sales${query ? `?${query}` : ''}`)
  },

  async createSale(saleData: Record<string, unknown>) {
    return fetchAPI('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    })
  },

  async getSaleDetail(id: string) {
    return fetchAPI(`/sales/${id}`)
  },

  async recordPayment(saleId: string, data: Record<string, unknown>) {
    return fetchAPI(`/sales/${saleId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Sales Order API services
export const salesOrderService = {
  async getSalesOrders(params?: {
    page?: number
    limit?: number
    search?: string
    storeId?: string
    status?: string
    customerId?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.customerId) searchParams.set('customerId', params.customerId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)

    const query = searchParams.toString()
    return fetchAPI(`/sales-orders${query ? `?${query}` : ''}`)
  },
  async getSalesOrder(id: string) {
    return fetchAPI(`/sales-orders/${id}`)
  },
  async createSalesOrder(orderData: Record<string, unknown>) {
    return fetchAPI('/sales-orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  },
  async bulkCancelSalesOrders(ids: string[]) {
    return fetchAPI('/sales-orders/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },
  async getSalesOrderPackages(id: string) {
    return fetchAPI(`/sales-orders/${id}/packages`)
  },
  async createPackage(orderId: string, data: Record<string, unknown>) {
    return fetchAPI(`/sales-orders/${orderId}/packages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Package API services
export const packageService = {
  async getPackage(id: string) {
    return fetchAPI(`/packages/${id}`)
  },
  async createShipment(packageId: string, data: Record<string, unknown>) {
    return fetchAPI(`/packages/${packageId}/shipments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Shipment API services
export const shipmentService = {
  async getShipment(id: string) {
    return fetchAPI(`/shipments/${id}`)
  },
}

// Sales Return API services
export const salesReturnService = {
  async getSalesReturns(params?: {
    page?: number
    limit?: number
    saleId?: string
    storeId?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.saleId) searchParams.set('saleId', params.saleId)
    if (params?.storeId) searchParams.set('storeId', params.storeId)

    const query = searchParams.toString()
    return fetchAPI(`/sales-returns${query ? `?${query}` : ''}`)
  },

  async createSalesReturn(returnData: Record<string, unknown>) {
    return fetchAPI('/sales-returns', {
      method: 'POST',
      body: JSON.stringify(returnData),
    })
  },
}

// Payment API services
export const paymentService = {
  async getPayments(params?: {
    page?: number
    limit?: number
    status?: string
    customerId?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.customerId) searchParams.set('customerId', params.customerId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)

    const query = searchParams.toString()
    return fetchAPI(`/payments${query ? `?${query}` : ''}`)
  },

  async getPaymentDetail(id: string) {
    return fetchAPI(`/payments/${id}`)
  },
}

// Purchase Payment API services
export const purchasePaymentService = {
  async getPurchasePayments(params?: {
    page?: number
    limit?: number
    status?: string
    supplierId?: string
    storeId?: string
    startDate?: string
    endDate?: string
    purchaseId?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.supplierId) searchParams.set('supplierId', params.supplierId)
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.purchaseId) searchParams.set('purchaseId', params.purchaseId)

    const query = searchParams.toString()
    return fetchAPI(`/purchase-payments${query ? `?${query}` : ''}`)
  },

  async getPurchasePaymentDetail(id: string) {
    return fetchAPI(`/purchase-payments/${id}`)
  },

  async getPaymentsForPurchase(purchaseId: string) {
    return fetchAPI(`/purchases/${purchaseId}/payments`)
  },

  async recordPayment(purchaseId: string, data: Record<string, unknown>) {
    return fetchAPI(`/purchases/${purchaseId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
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

  async getStockAdjustmentDetail(id: string) {
    return fetchAPI(`/inventory/stock-adjustments/${id}`)
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

// Bill (Purchase) API helpers
export const billService = {
  async getBills(params?: {
    page?: number
    limit?: number
    storeId?: string
    startDate?: string
    endDate?: string
    status?: string
    purchaseOrderId?: string
    supplierId?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.purchaseOrderId)
      searchParams.set('purchaseOrderId', params.purchaseOrderId)
    if (params?.supplierId) searchParams.set('supplierId', params.supplierId)

    const query = searchParams.toString()
    return fetchAPI(`/purchases${query ? `?${query}` : ''}`)
  },

  async createBill(billData: Record<string, unknown>) {
    return fetchAPI('/purchases', {
      method: 'POST',
      body: JSON.stringify(billData),
    })
  },

  async createBillFromPurchaseOrder(data: Record<string, unknown>) {
    return fetchAPI('/bills/create-from-purchase-order', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getBillDetail(id: string) {
    return fetchAPI(`/purchases/${id}`)
  },

  async getBillPayments(id: string) {
    return fetchAPI(`/purchases/${id}/payments`)
  },
}

// Purchase Order API services
export const purchaseOrderService = {
  async getPurchaseOrders(params?: {
    page?: number
    limit?: number
    search?: string
    storeId?: string
    status?: string
    supplierId?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.supplierId) searchParams.set('supplierId', params.supplierId)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)

    const query = searchParams.toString()
    return fetchAPI(`/purchase-orders${query ? `?${query}` : ''}`)
  },

  async getPurchaseOrder(id: string) {
    return fetchAPI(`/purchase-orders/${id}`)
  },

  async createPurchaseOrder(orderData: Record<string, unknown>) {
    return fetchAPI('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  },
}

// Purchase Receive (GRN) API services
export const purchaseReceiveService = {
  async getPurchaseReceives(params?: {
    page?: number
    limit?: number
    search?: string
    storeId?: string
    supplierId?: string
    purchaseOrderId?: string
    status?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()

    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)
    if (params?.storeId) searchParams.set('storeId', params.storeId)
    if (params?.supplierId) searchParams.set('supplierId', params.supplierId)
    if (params?.purchaseOrderId)
      searchParams.set('purchaseOrderId', params.purchaseOrderId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.startDate) searchParams.set('startDate', params.startDate)
    if (params?.endDate) searchParams.set('endDate', params.endDate)

    const query = searchParams.toString()
    return fetchAPI(`/purchase-receives${query ? `?${query}` : ''}`)
  },

  async getPurchaseReceive(id: string) {
    return fetchAPI(`/purchase-receives/${id}`)
  },

  async createPurchaseReceive(data: Record<string, unknown>) {
    return fetchAPI('/purchase-receives', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async postPurchaseReceive(id: string) {
    return fetchAPI(`/purchase-receives/${id}/post`, {
      method: 'POST',
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

// Email API services
export const emailService = {
  async sendEmail(data: Record<string, unknown>) {
    return fetchAPI('/email/send', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Batch (ItemBatch) API services
export const batchService = {
  async getBatches(params: { storeId: string; productId: string }) {
    const searchParams = new URLSearchParams()

    searchParams.set("storeId", params.storeId)
    searchParams.set("productId", params.productId)

    const query = searchParams.toString()
    return fetchAPI(`/inventory/batches${query ? `?${query}` : ""}`)
  },

  async getBatchMovements(batchId: string) {
    return fetchAPI(`/inventory/batches/${batchId}/movements`)
  },

  async adjustBatch(
    batchId: string,
    payload: { quantityDelta: number; reason?: string | null },
  ) {
    return fetchAPI(`/inventory/batches/${batchId}/adjust`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
}

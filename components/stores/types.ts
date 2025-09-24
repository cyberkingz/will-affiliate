export type StoreStatus = 'active' | 'inactive'

export interface ShopifyStore {
  id: string
  storeName: string
  storeUrl: string
  shopifyEmail: string
  shopifyPassword: string // Required for store details view
  status: StoreStatus
  createdAt: Date
  updatedAt: Date
}

export interface AddStoreFormData {
  storeName: string
  storeUrl: string
  shopifyEmail: string
  shopifyPassword: string
  status: StoreStatus
}
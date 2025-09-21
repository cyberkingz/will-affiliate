// Simple in-memory cache for API responses
class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  set(key: string, data: any, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000 // Convert to milliseconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key)
    
    if (!cached) {
      return null
    }
    
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  delete(key: string): void {
    this.cache.delete(key)
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const apiCache = new APICache()

// Clean up expired entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 10 * 60 * 1000)
}

export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key]
      return result
    }, {} as Record<string, any>)
  
  return `${prefix}_${JSON.stringify(sortedParams)}`
}
// Persistent API Cache with localStorage fallback
// This cache survives page refreshes, dramatically improving UX

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class PersistentAPICache {
  private memoryCache = new Map<string, CacheEntry<unknown>>()
  private storagePrefix = 'api_cache_'

  get<T>(key: string): T | null {
    // Try memory first (fastest - ~1ms)
    const memCached = this.memoryCache.get(key)
    if (memCached && Date.now() - memCached.timestamp <= memCached.ttl) {
      console.log(`💾 [CACHE] Memory hit: ${key}`)
      return memCached.data as T
    }

    // Try localStorage (persists across refreshes - ~5ms)
    if (typeof window === 'undefined') return null

    try {
      const storageKey = this.storagePrefix + key
      const cached = localStorage.getItem(storageKey)
      if (!cached) return null

      const { data, timestamp, ttl } = JSON.parse(cached)

      // Check if expired
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(storageKey)
        this.memoryCache.delete(key)
        console.log(`🗑️ [CACHE] Expired and removed: ${key}`)
        return null
      }

      // Restore to memory cache for faster subsequent access
      this.memoryCache.set(key, { data, timestamp, ttl })
      console.log(`💾 [CACHE] localStorage hit: ${key}`)
      return data as T
    } catch (error) {
      console.warn(`⚠️ [CACHE] Failed to read from localStorage:`, error)
      return null
    }
  }

  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000
    const entry = { data, timestamp: Date.now(), ttl }

    // Set in memory (always succeeds)
    this.memoryCache.set(key, entry)

    // Persist to localStorage (may fail on quota exceeded)
    if (typeof window !== 'undefined') {
      try {
        const storageKey = this.storagePrefix + key
        localStorage.setItem(storageKey, JSON.stringify(entry))
        console.log(`💾 [CACHE] Stored: ${key} (TTL: ${ttlMinutes}m)`)
      } catch (error) {
        console.warn(`⚠️ [CACHE] Failed to persist to localStorage:`, error)
        // Clean up old entries if quota exceeded
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          this.cleanupOldEntries()
          // Try again after cleanup
          try {
            const storageKey = this.storagePrefix + key
            localStorage.setItem(storageKey, JSON.stringify(entry))
          } catch {
            console.warn(`⚠️ [CACHE] Still failed after cleanup, using memory only`)
          }
        }
      }
    }
  }

  delete(key: string): void {
    this.memoryCache.delete(key)

    if (typeof window !== 'undefined') {
      const storageKey = this.storagePrefix + key
      localStorage.removeItem(storageKey)
    }
  }

  clear(): void {
    this.memoryCache.clear()

    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key)
        }
      })
    }
    console.log(`🗑️ [CACHE] Cleared all cache entries`)
  }

  // Clean up expired entries from both memory and localStorage
  cleanup(): void {
    const now = Date.now()

    // Clean memory cache
    for (const [key, cached] of this.memoryCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.memoryCache.delete(key)
      }
    }

    // Clean localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          try {
            const cached = JSON.parse(localStorage.getItem(key) || '{}')
            if (cached.timestamp && now - cached.timestamp > cached.ttl) {
              localStorage.removeItem(key)
            }
          } catch {
            // Remove corrupted entries
            localStorage.removeItem(key)
          }
        }
      })
    }

    console.log(`🧹 [CACHE] Cleanup completed`)
  }

  // Remove oldest entries to free up space
  private cleanupOldEntries(): void {
    if (typeof window === 'undefined') return

    const entries: Array<{ key: string; timestamp: number }> = []

    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.storagePrefix)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key) || '{}')
          if (cached.timestamp) {
            entries.push({ key, timestamp: cached.timestamp })
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key)
        }
      }
    })

    // Sort by timestamp (oldest first) and remove oldest 25%
    entries.sort((a, b) => a.timestamp - b.timestamp)
    const toRemove = Math.ceil(entries.length * 0.25)

    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key)
      const cacheKey = entries[i].key.replace(this.storagePrefix, '')
      this.memoryCache.delete(cacheKey)
    }

    console.log(`🧹 [CACHE] Removed ${toRemove} oldest entries`)
  }

  // Get cache statistics
  getStats(): {
    memoryEntries: number
    localStorageEntries: number
    totalSize: number
  } {
    const stats = {
      memoryEntries: this.memoryCache.size,
      localStorageEntries: 0,
      totalSize: 0
    }

    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          stats.localStorageEntries++
          const item = localStorage.getItem(key) || ''
          stats.totalSize += item.length * 2 // UTF-16 encoding = 2 bytes per char
        }
      })
    }

    return stats
  }
}

export const persistentCache = new PersistentAPICache()

// Clean up expired entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    persistentCache.cleanup()
  }, 10 * 60 * 1000)
}

// Helper function to create cache keys (same as before for compatibility)
export function createCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = params[key]
      return result
    }, {})

  return `${prefix}_${JSON.stringify(sortedParams)}`
}

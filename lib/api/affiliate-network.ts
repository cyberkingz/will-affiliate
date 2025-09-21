// Affiliate Network API Integration
// Base configuration for the affiliate network API

export interface NetworkConfig {
  baseUrl: string
  affiliateId: string
  apiKey: string
  name: string
}

export interface APIResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

export interface CampaignSummaryData {
  campaign_id: string
  campaign_name: string
  offer_id: string
  offer_name: string
  clicks: number
  conversions: number
  revenue: number
  payout: number
  epc: number
  cvr: number
  date: string
}

// Affluent API Response Interfaces
export interface AffluentClickData {
  unique_click_id: string
  tracking_id: string
  udid: string
  request_session_id: string
  click_date: string
  offer: {
    offer_id: number
    offer_name: string
  }
  redirect_from_offer: {
    offer_id: number
    offer_name: string
  }
  campaign_id: number
  subid_1: string
  subid_2: string
  subid_3: string
  subid_4: string
  subid_5: string
  ip_address: string
  paid_action: string
  price: number
  duplicate: boolean
}

export interface AffluentAPIResponse<T> {
  row_count: number
  data: T[]
  success: boolean
  message: string | null
}

// Our internal interface (transformed from Affluent data)
export interface ClickData {
  id: string
  dateTime: string
  offerName: string
  subId: string
  subId2: string
  campaignId: string
  price?: number
}

export interface ConversionData {
  conversion_id: string
  request_session_id: string
  click_id: string
  transaction_id: string
  campaign_id: string
  offer_id: string
  offer_name: string
  advertiser_info: string
  payout: number
  revenue: number
  sub_id: string
  sub_id_2: string
  sub_id_3: string
  sub_id_4: string
  sub_id_5: string
  ip_address: string
  country: string
  region: string
  city: string
  datetime: string
  conversion_status: string
}

export interface HourlySummaryData {
  hour: string
  clicks: number
  conversions: number
  revenue: number
  payout: number
  epc: number
  cvr: number
}

export class AffiliateNetworkAPI {
  private config: NetworkConfig

  constructor(config: NetworkConfig) {
    this.config = config
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<AffluentAPIResponse<T>> {
    const url = new URL(endpoint, this.config.baseUrl)
    
    // Add authentication parameters
    url.searchParams.append('affiliate_id', this.config.affiliateId)
    url.searchParams.append('api_key', this.config.apiKey)
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    console.log('🌐 [API] Making request to:', url.toString())
    console.log('📋 [API] Request params:', params)
    console.log('🔐 [API] Auth info:', {
      affiliateId: this.config.affiliateId,
      hasApiKey: !!this.config.apiKey,
      baseUrl: this.config.baseUrl
    })

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WillAffiliate-Dashboard/1.0'
        }
      })

      console.log('📥 [API] Response status:', response.status, response.statusText)
      console.log('📋 [API] Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [API] Error response body:', errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }

      const responseText = await response.text()
      console.log('📄 [API] Raw response:', responseText.slice(0, 500) + (responseText.length > 500 ? '...' : ''))
      
      let data: AffluentAPIResponse<T>
      try {
        data = JSON.parse(responseText)
        console.log('✅ [API] Parsed response:', {
          success: data.success,
          row_count: data.row_count,
          message: data.message,
          dataLength: data.data?.length || 0
        })
      } catch (parseError) {
        console.error('❌ [API] JSON parse error:', parseError)
        throw new Error(`Invalid JSON response: ${parseError.message}`)
      }
      
      return data
    } catch (error) {
      console.error(`❌ [API] Error for ${endpoint}:`, error)
      console.error('🔍 [API] Error details:', {
        message: error.message,
        stack: error.stack
      })
      return {
        row_count: 0,
        data: [],
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getCampaignSummary(params: {
    start_date: string // YYYY-MM-DD
    end_date: string   // YYYY-MM-DD
    campaign_id?: string
    offer_id?: string
  }): Promise<AffluentAPIResponse<CampaignSummaryData>> {
    return this.makeRequest<CampaignSummaryData>('/Reports/CampaignSummary', params)
  }

  async getClicks(params: {
    start_date: string
    end_date: string
    campaign_id?: number
    offer_id?: number
    include_duplicates?: boolean
    start_at_row?: number
    row_limit?: number
    sort_field?: string
    sort_descending?: boolean
  }): Promise<AffluentAPIResponse<AffluentClickData>> {
    // Set defaults for Affluent API
    const apiParams = {
      ...params,
      start_at_row: params.start_at_row || 1,
      row_limit: params.row_limit || 50,
      include_duplicates: params.include_duplicates !== false // default true
    }
    
    return this.makeRequest<AffluentClickData>('/Reports/Clicks', apiParams)
  }

  async getConversions(params: {
    start_date: string
    end_date: string
    campaign_id?: string
    offer_id?: string
    sub_id?: string
    limit?: number
    page?: number
  }): Promise<AffluentAPIResponse<ConversionData>> {
    return this.makeRequest<ConversionData>('/Reports/Conversions', params)
  }

  async getHourlySummary(params: {
    start_date: string
    end_date: string
    campaign_id?: string
    offer_id?: string
  }): Promise<AffluentAPIResponse<HourlySummaryData>> {
    return this.makeRequest<HourlySummaryData>('/Reports/HourlySummary', params)
  }

  async getDailySummary(params: {
    start_date: string
    end_date: string
    campaign_id?: string
    offer_id?: string
  }): Promise<AffluentAPIResponse<any>> {
    return this.makeRequest<any>('/Reports/DailySummary', params)
  }

  async getOfferFeed(params: {
    offer_status_id?: number
    vertical_category_id?: number
    medium_id?: number
  } = {}): Promise<AffluentAPIResponse<any>> {
    return this.makeRequest<any>('/Offers/Feed', params)
  }

  async getCampaign(params: {
    campaign_id?: number
    fields?: string[]
  } = {}): Promise<AffluentAPIResponse<any>> {
    return this.makeRequest<any>('/Offers/Campaign', params)
  }

  async getPerformanceSummary(): Promise<AffluentAPIResponse<any>> {
    return this.makeRequest<any>('/Reports/PerformanceSummary')
  }
}

// Default configuration from environment variables
export const defaultNetworkConfig: NetworkConfig = {
  baseUrl: process.env.AFFILIATE_NETWORK_BASE_URL || 'https://login.affluentco.com/affiliates/api',
  affiliateId: process.env.AFFILIATE_NETWORK_AFFILIATE_ID || process.env.FLUENT_AFFILIATE_ID || '208409',
  apiKey: process.env.AFFILIATE_NETWORK_API_KEY || process.env.FLUENT_API_KEY || 'Y0R1KxgxHpi2q88ZcYi7ag',
  name: process.env.AFFILIATE_NETWORK_NAME || 'Affluent'
}
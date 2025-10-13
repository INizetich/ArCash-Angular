export interface CacheConfig {
  key: string;
  expiryKey: string;
  duration: number;
}

export interface CacheData<T> {
  data: T;
  timestamp: number;
  isValid: boolean;
}

export interface CacheValidation {
  hasCache: boolean;
  hasExpiry: boolean;
  isValid: boolean;
  timestamp?: number;
  expiry?: number;
}

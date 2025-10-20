export default interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationConfig {
  page: number;
  size: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ModalState {
  currentModal: string | null;
  isOpen: boolean;
}

export interface DeviceInfo {
  isLowPower: boolean;
  cores: number;
  memory?: number;
  isMobile: boolean;
}

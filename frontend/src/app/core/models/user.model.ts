export interface User {
  id: string;
  name: { en: string; ar: string } | string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}
export interface User {
  id: string;
  name: { en: string; ar: string } | string;
  email: string;
  role: 'user' | 'admin' | 'company';
  avatar?: string;
  plan: string;
  maxToken: number;
  tokenUsage: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface LoginData {
  email: string;
  password: string;
}

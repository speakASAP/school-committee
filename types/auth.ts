export type Role =
  | "parent"
  | "committee"
  | "teacher"
  | "school_staff"
  | "admin";

export interface AuthUser {
  id: string;
  email: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

export interface CurrentUser {
  id: string;
  email: string;
  roles: Role[];
}

export interface JwtClaims {
  sub: string;
  email: string;
  type: string;
  roles: string[];
  auth_method?: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthLoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  // legacy wrapped shape — not used by current auth-microservice
  data?: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  };
}

export interface AuthValidateResponse {
  id: string;
  email: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

export interface AuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
  // legacy wrapped shape — not used by current auth-microservice
  data?: {
    accessToken: string;
    refreshToken: string;
  };
}

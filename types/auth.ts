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
  success: boolean;
  data: {
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
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

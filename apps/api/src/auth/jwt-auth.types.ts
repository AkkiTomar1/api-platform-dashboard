export interface JwtAuthPayload {
  sub: string;
  email?: string;
  type?: "access";
  iat?: number;
  exp?: number;
  iss?: string;
}
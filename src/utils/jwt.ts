import { jwtVerify, SignJWT } from 'jose'
import type { JWTPayload } from '../types'

/**
 * 生成 JWT 令牌
 * @param payload JWT 载荷（包含 userId、username、type、siteId）
 * @param secret JWT 密钥
 * @param expiresIn 过期时间（例如 "7d"）
 * @returns JWT 令牌字符串
 */
export async function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string = '7d'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)

  const token = await new SignJWT({
    userId: payload.userId,
    username: payload.username,
    type: payload.type,
    siteId: payload.siteId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey)

  return token
}

/**
 * 验证并解码 JWT 令牌
 * @param token JWT 令牌字符串
 * @param secret JWT 密钥
 * @returns 解码后的 JWT 载荷
 * @throws 如果令牌无效或过期
 */
export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const secretKey = new TextEncoder().encode(secret)

  const { payload } = await jwtVerify(token, secretKey)

  return {
    userId: payload.userId as number,
    username: payload.username as string,
    type: payload.type as JWTPayload['type'],
    siteId: payload.siteId as number | null,
    iat: payload.iat,
    exp: payload.exp,
  }
}

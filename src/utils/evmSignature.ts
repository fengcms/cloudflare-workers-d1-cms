/**
 * EVM 签名验证工具
 * 
 * 提供 EVM 钱包签名验证、地址恢复和格式验证功能。
 * 使用 EIP-191 标准格式化签名消息。
 * 
 * **验证需求**: 21.2, 21.3, 21.7, 21.9, 21.10
 */

import { isAddress, getAddress } from 'viem'

/**
 * EVM 地址格式正则表达式
 * 格式：0x + 40 个十六进制字符
 */
const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/

/**
 * 生成钱包登录的 nonce 消息
 * 
 * 使用 EIP-191 标准格式，包含应用名称、nonce 和时间戳。
 * 
 * @returns 格式化的登录消息
 * 
 * **验证需求**: 21.2, 21.7
 */
export function generateWalletLoginMessage(): string {
  // 生成随机 nonce（16 字节的十六进制字符串）
  const nonce = generateRandomNonce()
  
  // 获取当前时间戳
  const timestamp = Math.floor(Date.now() / 1000)
  
  // 格式化消息（EIP-191 标准）
  const message = `Sign this message to login to Cloudflare CMS

Nonce: ${nonce}
Timestamp: ${timestamp}`
  
  return message
}

/**
 * 验证 EVM 签名并恢复签名者地址
 * 
 * 使用 viem 库验证签名的有效性并恢复签名者的地址。
 * 
 * @param message - 被签名的原始消息
 * @param signature - 签名字符串（0x 开头的十六进制）
 * @returns 恢复的签名者地址（小写）
 * @throws 如果签名无效或无法恢复地址
 * 
 * **验证需求**: 21.3, 21.4, 21.8
 */
export async function verifySignatureAndRecoverAddress(
  message: string,
  signature: `0x${string}`
): Promise<string> {
  try {
    // 使用 viem 的 recoverMessageAddress 恢复签名者地址
    const { recoverMessageAddress } = await import('viem')
    
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature
    })
    
    // 返回小写地址以确保一致性
    return recoveredAddress.toLowerCase()
  } catch (error) {
    throw new Error(`签名验证失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 验证 EVM 地址格式
 * 
 * 检查地址是否符合 EVM 地址格式：0x + 40 个十六进制字符。
 * 
 * @param address - 要验证的地址
 * @returns true 表示格式有效，false 表示无效
 * 
 * **验证需求**: 21.9
 */
export function validateEvmAddressFormat(address: string): boolean {
  // 使用正则表达式验证格式
  if (!EVM_ADDRESS_REGEX.test(address)) {
    return false
  }
  
  // 使用 viem 的 isAddress 进行额外验证
  return isAddress(address)
}

/**
 * 规范化 EVM 地址
 * 
 * 将地址转换为校验和格式（checksum format），然后转换为小写。
 * 这确保了地址的一致性存储。
 * 
 * @param address - 要规范化的地址
 * @returns 规范化后的地址（小写）
 * @throws 如果地址格式无效
 * 
 * **验证需求**: 21.10
 */
export function normalizeEvmAddress(address: string): string {
  if (!validateEvmAddressFormat(address)) {
    throw new Error(`无效的 EVM 地址格式: ${address}`)
  }
  
  // 使用 viem 的 getAddress 获取校验和格式，然后转换为小写
  const checksumAddress = getAddress(address)
  return checksumAddress.toLowerCase()
}

/**
 * 生成随机 nonce
 * 
 * 生成一个 16 字节（32 个十六进制字符）的随机字符串。
 * 
 * @returns 随机 nonce 字符串
 */
function generateRandomNonce(): string {
  // 生成 16 字节的随机数据
  const randomBytes = new Uint8Array(16)
  crypto.getRandomValues(randomBytes)
  
  // 转换为十六进制字符串
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 验证消息的时间戳是否在有效期内
 * 
 * 检查消息中的时间戳是否在指定的有效期内（默认 5 分钟）。
 * 这可以防止重放攻击。
 * 
 * @param message - 包含时间戳的消息
 * @param maxAgeSeconds - 最大有效期（秒），默认 300 秒（5 分钟）
 * @returns true 表示时间戳有效，false 表示已过期
 */
export function validateMessageTimestamp(
  message: string,
  maxAgeSeconds: number = 300
): boolean {
  // 从消息中提取时间戳
  const timestampMatch = message.match(/Timestamp: (\d+)/)
  
  if (!timestampMatch) {
    return false
  }
  
  const messageTimestamp = parseInt(timestampMatch[1], 10)
  const currentTimestamp = Math.floor(Date.now() / 1000)
  
  // 检查时间戳是否在有效期内
  const age = currentTimestamp - messageTimestamp
  return age >= 0 && age <= maxAgeSeconds
}

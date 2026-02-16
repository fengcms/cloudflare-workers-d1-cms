/**
 * Image Upload Service
 *
 * 处理图片上传到 Cloudflare R2 存储。
 * 实现文件验证、唯一文件名生成和 R2 上传功能。
 *
 * **验证需求**: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import type { ImageUploadResult } from '../types'

/**
 * 支持的图片 MIME 类型
 */
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * 默认最大上传大小（5MB）
 */
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024

export class ImageUploadService {
  constructor(
    private r2Bucket: R2Bucket,
    private publicDomain: string = 'https://images.example.com',
    private maxSize: number = DEFAULT_MAX_SIZE
  ) {}

  /**
   * 上传图片到 R2
   *
   * 验证文件类型和大小，使用 SHA256 hash 作为文件名，上传到 R2 存储。
   * 使用 hash 作为文件名可以自动去重，避免同一张图片重复占用存储空间。
   *
   * @param file - 上传的文件
   * @param siteId - 站点ID（用于文件路径隔离）
   * @returns 上传结果（包含公共 URL 和文件名）
   *
   * **验证需求**: 11.1, 11.3, 11.4, 11.5, 11.6
   */
  async upload(file: File, siteId: number): Promise<ImageUploadResult> {
    // 验证文件类型
    if (!this.validateImageType(file)) {
      throw new Error(
        `不支持的文件类型: ${file.type}。支持的类型: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
      )
    }

    // 验证文件大小
    if (file.size > this.maxSize) {
      throw new Error(`文件大小超过限制。最大允许: ${this.maxSize / 1024 / 1024}MB`)
    }

    try {
      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer()

      // 计算文件的 SHA256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // 提取文件扩展名
      const extension = this.getFileExtension(file.name)

      // 生成文件名: {siteId}/{hash}.{extension}
      const filename = `${siteId}/${hashHex}.${extension}`

      // 检查文件是否已存在（通过 head 请求）
      const existingFile = await this.r2Bucket.head(filename)

      if (!existingFile) {
        // 文件不存在，上传到 R2
        await this.r2Bucket.put(filename, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
          },
        })
      }
      // 如果文件已存在，直接返回 URL，实现去重

      // 生成公共 URL
      const url = `${this.publicDomain}/${filename}`

      return {
        url,
        filename,
      }
    } catch (error) {
      throw new Error(`图片上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 生成唯一文件名（已弃用，保留以备将来使用）
   *
   * 注意：当前实现使用 SHA256 hash 作为文件名，此方法不再使用。
   * 格式: {siteId}/{timestamp}-{randomString}.{extension}
   * 使用时间戳和随机字符串确保文件名唯一性。
   *
   * @param originalName - 原始文件名
   * @param siteId - 站点ID
   * @returns 唯一文件名
   *
   * @deprecated 使用 SHA256 hash 作为文件名替代
   */
  generateFilename(originalName: string, siteId: number): string {
    // 提取文件扩展名
    const extension = this.getFileExtension(originalName)

    // 生成时间戳（毫秒）
    const timestamp = Date.now()

    // 生成随机字符串（8位）
    const randomString = this.generateRandomString(8)

    // 组合文件名: {siteId}/{timestamp}-{randomString}.{extension}
    return `${siteId}/${timestamp}-${randomString}.${extension}`
  }

  /**
   * 验证图片类型
   *
   * 检查文件的 MIME 类型是否在支持列表中。
   *
   * @param file - 上传的文件
   * @returns true 表示类型有效，false 表示无效
   *
   * **验证需求**: 11.4
   */
  validateImageType(file: File): boolean {
    return SUPPORTED_IMAGE_TYPES.includes(file.type)
  }

  /**
   * 获取文件扩展名
   *
   * @param filename - 文件名
   * @returns 文件扩展名（不含点号）
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.')
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase()
    }
    return 'jpg' // 默认扩展名
  }

  /**
   * 生成随机字符串
   *
   * 使用字母和数字生成指定长度的随机字符串。
   *
   * @param length - 字符串长度
   * @returns 随机字符串
   */
  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''

    // 使用 crypto.getRandomValues 生成安全的随机数
    const randomValues = new Uint8Array(length)
    crypto.getRandomValues(randomValues)

    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length]
    }

    return result
  }
}

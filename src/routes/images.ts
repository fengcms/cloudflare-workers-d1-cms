/**
 * 图片上传路由
 *
 * 实现图片上传相关的 API 端点：
 * - POST /api/v1/upload - 上传图片（需要认证）
 *
 * **验证需求**: 11.1, 11.3, 11.5
 */

import type { Context } from 'hono'
import { Hono } from 'hono'
import { ValidationError } from '../errors'
import { authMiddleware } from '../middleware/auth'
import { getSiteContext, siteMiddleware } from '../middleware/site'
import { ImageUploadService } from '../services/imageUploadService'
import { successResponse } from '../utils/response'

const images = new Hono()

/**
 * POST /api/v1/upload
 * 上传图片（需要认证）
 *
 * 请求体：multipart/form-data
 * - file: File - 上传的图片文件
 *
 * 响应：ImageUploadResult
 * - url: string - 图片的公共访问 URL
 * - filename: string - 存储的文件名
 *
 * **验证需求**: 11.1, 11.3, 11.5
 */
images.post('/upload', authMiddleware, siteMiddleware, async (c: Context) => {
  const { siteId } = getSiteContext(c)

  // 解析 multipart/form-data
  const formData = await c.req.formData()

  // 获取上传的文件
  const file = formData.get('file')

  // 验证文件是否存在
  if (!file) {
    throw new ValidationError('缺少上传文件，请在表单字段 "file" 中提供文件')
  }

  // 验证文件类型
  if (!(file instanceof File)) {
    throw new ValidationError('上传的内容不是有效的文件')
  }

  // 创建图片上传服务实例
  const publicDomain = c.env.PUBLIC_DOMAIN || 'https://images.example.com'
  const maxSize = c.env.MAX_UPLOAD_SIZE || 5 * 1024 * 1024
  const imageUploadService = new ImageUploadService(c.env.IMAGES, publicDomain, maxSize)

  // 上传图片
  const result = await imageUploadService.upload(file, siteId)

  return c.json(successResponse(result), 201)
})

export default images

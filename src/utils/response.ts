import type { ErrorResponse, SuccessResponse } from '../types'

/**
 * 创建成功响应
 *
 * 根据需求 13.1：当操作成功时，系统应返回包含成功状态和数据的 JSON 响应
 *
 * @param data - 响应数据
 * @returns 格式化的成功响应对象
 */
export function successResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  }
}

/**
 * 创建错误响应
 *
 * 根据需求 13.2：当操作失败时，系统应返回包含错误状态和消息的 JSON 响应
 *
 * @param code - 错误代码
 * @param message - 错误消息
 * @param details - 可选的详细错误信息（用于验证错误）
 * @returns 格式化的错误响应对象
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, string[]>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  }
}

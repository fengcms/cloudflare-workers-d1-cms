import { describe, expect, it } from 'vitest'
import type { ErrorResponse, SuccessResponse } from '../types'
import { errorResponse, successResponse } from './response'

describe('Response Formatting Utilities', () => {
  describe('successResponse', () => {
    it('should create a success response with data - Requirement 13.1', () => {
      const data = { id: 1, name: 'Test' }
      const response = successResponse(data)

      expect(response).toEqual({
        success: true,
        data: { id: 1, name: 'Test' },
      })
    })

    it('should handle null data', () => {
      const response = successResponse(null)

      expect(response).toEqual({
        success: true,
        data: null,
      })
    })

    it('should handle array data', () => {
      const data = [{ id: 1 }, { id: 2 }]
      const response = successResponse(data)

      expect(response).toEqual({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
      })
    })

    it('should handle paginated data - Requirement 13.4', () => {
      const data = {
        data: [{ id: 1 }, { id: 2 }],
        total: 10,
        page: 1,
        pageSize: 2,
        totalPages: 5,
      }
      const response = successResponse(data)

      expect(response).toEqual({
        success: true,
        data: {
          data: [{ id: 1 }, { id: 2 }],
          total: 10,
          page: 1,
          pageSize: 2,
          totalPages: 5,
        },
      })
    })

    it('should have consistent field names - Requirement 13.3', () => {
      const response = successResponse({ test: 'data' })

      expect(response).toHaveProperty('success')
      expect(response).toHaveProperty('data')
      expect(response.success).toBe(true)
    })
  })

  describe('errorResponse', () => {
    it('should create an error response with code and message - Requirement 13.2', () => {
      const response = errorResponse('BAD_REQUEST', 'Invalid input')

      expect(response).toEqual({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input',
        },
      })
    })

    it('should include details when provided', () => {
      const details = {
        username: ['Username is required'],
        email: ['Email format is invalid'],
      }
      const response = errorResponse('VALIDATION_ERROR', 'Validation failed', details)

      expect(response).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: {
            username: ['Username is required'],
            email: ['Email format is invalid'],
          },
        },
      })
    })

    it('should not include details field when not provided', () => {
      const response = errorResponse('NOT_FOUND', 'Resource not found')

      expect(response).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      })
      expect(response.error).not.toHaveProperty('details')
    })

    it('should have consistent field names - Requirement 13.3', () => {
      const response = errorResponse('ERROR', 'Test error')

      expect(response).toHaveProperty('success')
      expect(response).toHaveProperty('error')
      expect(response.success).toBe(false)
      expect(response.error).toHaveProperty('code')
      expect(response.error).toHaveProperty('message')
    })
  })

  describe('Response Format Consistency - Requirement 13.3', () => {
    it('should use consistent structure across all responses', () => {
      const success = successResponse({ id: 1 })
      const error = errorResponse('ERROR', 'Test')

      // Both should have success field
      expect(success).toHaveProperty('success')
      expect(error).toHaveProperty('success')

      // Success should have data, error should have error
      expect(success).toHaveProperty('data')
      expect(error).toHaveProperty('error')

      // Type guards should work
      if (success.success) {
        expect(success.data).toBeDefined()
      }

      if (!error.success) {
        expect(error.error).toBeDefined()
        expect(error.error.code).toBeDefined()
        expect(error.error.message).toBeDefined()
      }
    })
  })

  describe('Type Safety', () => {
    it('should maintain type safety for success responses', () => {
      interface TestData {
        id: number
        name: string
      }

      const response: SuccessResponse<TestData> = successResponse({ id: 1, name: 'Test' })

      expect(response.data.id).toBe(1)
      expect(response.data.name).toBe('Test')
    })

    it('should maintain type safety for error responses', () => {
      const response: ErrorResponse = errorResponse('ERROR', 'Test error')

      expect(response.error.code).toBe('ERROR')
      expect(response.error.message).toBe('Test error')
    })
  })
})

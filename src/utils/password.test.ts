import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { hashPassword, verifyPassword } from './password'

describe('Password Hashing Utilities', () => {
  describe('Unit Tests', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should verify correct password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword456'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hash)

      expect(isValid).toBe(false)
    })

    it('should produce different hashes for same password', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      // Hashes should be different due to salt
      expect(hash1).not.toBe(hash2)
      
      // But both should verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true)
      expect(await verifyPassword(password, hash2)).toBe(true)
    })

    it('should handle empty password', async () => {
      const password = ''
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should handle special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should handle unicode characters', async () => {
      const password = '密码测试🔒'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000)
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 10.1, 10.2**
     * 
     * Property 19: 密码哈希验证对称性
     * 
     * For any password string, if hashPassword(password) generates hash h,
     * then verifyPassword(password, h) must return true
     */
    it('Property 19: Password hash verification symmetry - Requirements 10.1, 10.2', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 100 }),
          async (password) => {
            // Hash the password
            const hash = await hashPassword(password)
            
            // Verify that the original password matches the hash
            const isValid = await verifyPassword(password, hash)
            
            // Property: verification must always succeed for the original password
            expect(isValid).toBe(true)
          }
        ),
        { numRuns: 50 }
      )
    }, 60000)

    it('Property: Different passwords should not verify against the same hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (password1, password2) => {
            // Skip if passwords are the same
            fc.pre(password1 !== password2)
            
            // Hash the first password
            const hash = await hashPassword(password1)
            
            // Verify that the second password does not match
            const isValid = await verifyPassword(password2, hash)
            
            // Property: different passwords should not verify
            expect(isValid).toBe(false)
          }
        ),
        { numRuns: 30 }
      )
    }, 60000)

    it('Property: Hash should never equal the original password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 100 }),
          async (password) => {
            // Hash the password
            const hash = await hashPassword(password)
            
            // Property: hash should never be the same as the original password
            expect(hash).not.toBe(password)
          }
        ),
        { numRuns: 50 }
      )
    }, 60000)

    it('Property: Hash should be non-empty for any password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 100 }),
          async (password) => {
            // Hash the password
            const hash = await hashPassword(password)
            
            // Property: hash should always be non-empty
            expect(hash).toBeDefined()
            expect(hash.length).toBeGreaterThan(0)
            expect(typeof hash).toBe('string')
          }
        ),
        { numRuns: 50 }
      )
    }, 60000)
  })
})

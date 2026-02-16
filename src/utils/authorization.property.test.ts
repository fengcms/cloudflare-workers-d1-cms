/**
 * 角色权限层级属性测试
 * Feature: cloudflare-cms-api, Property 8: 角色权限层级
 * **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { checkPermission, getRoleLevel, compareRoles } from './authorization'
import { UserTypeEnum } from '../types'

// 定义所有角色
const allRoles = [
  UserTypeEnum.SUPERMANAGE,
  UserTypeEnum.MANAGE,
  UserTypeEnum.EDITOR,
  UserTypeEnum.USER
] as const

// 角色任意生成器
const roleArbitrary = fc.constantFrom(...allRoles)

describe('属性 8: 角色权限层级', () => {
  /**
   * 属性 8.1: 角色层级传递性
   * 如果角色 A >= 角色 B，且角色 B >= 角色 C，则角色 A >= 角色 C
   */
  it('应该满足角色层级的传递性', () => {
    fc.assert(
      fc.property(
        roleArbitrary,
        roleArbitrary,
        roleArbitrary,
        (roleA, roleB, roleC) => {
          const aLevel = getRoleLevel(roleA)
          const bLevel = getRoleLevel(roleB)
          const cLevel = getRoleLevel(roleC)
          
          // 如果 A >= B 且 B >= C，则 A >= C
          if (aLevel >= bLevel && bLevel >= cLevel) {
            expect(aLevel).toBeGreaterThanOrEqual(cLevel)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 8.2: SUPERMANAGE 拥有最高权限
   * 对于任何操作，如果其他角色被拒绝，SUPERMANAGE 必须被允许
   * **Validates: Requirements 4.2**
   */
  it('SUPERMANAGE 应该对所有操作拥有最高权限', () => {
    fc.assert(
      fc.property(
        roleArbitrary,
        (requiredRole) => {
          // SUPERMANAGE 应该能够执行任何需要任意角色的操作
          const hasPermission = checkPermission(UserTypeEnum.SUPERMANAGE, requiredRole)
          expect(hasPermission).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 8.3: MANAGE 角色权限一致性
   * MANAGE 应该能够执行 EDITOR 和 USER 能执行的所有操作
   * **Validates: Requirements 4.3**
   */
  it('MANAGE 应该拥有比 EDITOR 和 USER 更高或相等的权限', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(UserTypeEnum.EDITOR, UserTypeEnum.USER),
        (lowerRole) => {
          // 如果 EDITOR 或 USER 能执行某操作，MANAGE 也应该能执行
          const lowerCanDo = checkPermission(lowerRole, lowerRole)
          const manageCanDo = checkPermission(UserTypeEnum.MANAGE, lowerRole)
          
          if (lowerCanDo) {
            expect(manageCanDo).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 8.4: EDITOR 角色权限一致性
   * EDITOR 应该能够执行 USER 能执行的所有操作
   * **Validates: Requirements 4.4**
   */
  it('EDITOR 应该拥有比 USER 更高或相等的权限', () => {
    fc.assert(
      fc.property(
        fc.constant(UserTypeEnum.USER),
        (userRole) => {
          // 如果 USER 能执行某操作，EDITOR 也应该能执行
          const userCanDo = checkPermission(userRole, userRole)
          const editorCanDo = checkPermission(UserTypeEnum.EDITOR, userRole)
          
          if (userCanDo) {
            expect(editorCanDo).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 8.5: USER 角色权限限制
   * 如果 USER 角色被拒绝访问某操作，则更高权限角色的检查结果应该保持一致或更宽松
   * **Validates: Requirements 4.5**
   */
  it('如果 USER 被拒绝，更高权限角色应该保持一致或更宽松', () => {
    fc.assert(
      fc.property(
        roleArbitrary,
        (requiredRole) => {
          const userCanDo = checkPermission(UserTypeEnum.USER, requiredRole)
          
          // 如果 USER 不能执行操作
          if (!userCanDo) {
            // 检查其他角色的权限
            const editorCanDo = checkPermission(UserTypeEnum.EDITOR, requiredRole)
            const manageCanDo = checkPermission(UserTypeEnum.MANAGE, requiredRole)
            const superCanDo = checkPermission(UserTypeEnum.SUPERMANAGE, requiredRole)
            
            // 更高权限的角色应该有相同或更宽松的权限
            // 即：如果 USER 不能做，EDITOR 可能能做也可能不能做
            // 但是权限级别应该是单调递增的
            const userLevel = getRoleLevel(UserTypeEnum.USER)
            const editorLevel = getRoleLevel(UserTypeEnum.EDITOR)
            const manageLevel = getRoleLevel(UserTypeEnum.MANAGE)
            const superLevel = getRoleLevel(UserTypeEnum.SUPERMANAGE)
            const requiredLevel = getRoleLevel(requiredRole)
            
            // 验证权限检查结果与级别一致
            expect(userCanDo).toBe(userLevel >= requiredLevel)
            expect(editorCanDo).toBe(editorLevel >= requiredLevel)
            expect(manageCanDo).toBe(manageLevel >= requiredLevel)
            expect(superCanDo).toBe(superLevel >= requiredLevel)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 8.6: 角色层级单调性
   * 对于任意两个角色，权限级别应该是完全有序的
   */
  it('角色层级应该是完全有序的', () => {
    fc.assert(
      fc.property(
        roleArbitrary,
        roleArbitrary,
        (role1, role2) => {
          const level1 = getRoleLevel(role1)
          const level2 = getRoleLevel(role2)
          const comparison = compareRoles(role1, role2)
          
          // 验证比较结果与级别一致
          if (level1 > level2) {
            expect(comparison).toBe(1)
          } else if (level1 < level2) {
            expect(comparison).toBe(-1)
          } else {
            expect(comparison).toBe(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 8.7: 权限检查对称性
   * 如果角色 A 可以执行需要角色 B 的操作，则 A 的权限级别 >= B 的权限级别
   */
  it('权限检查应该与角色级别一致', () => {
    fc.assert(
      fc.property(
        roleArbitrary,
        roleArbitrary,
        (userRole, requiredRole) => {
          const hasPermission = checkPermission(userRole, requiredRole)
          const userLevel = getRoleLevel(userRole)
          const requiredLevel = getRoleLevel(requiredRole)
          
          // 权限检查结果应该与级别比较一致
          expect(hasPermission).toBe(userLevel >= requiredLevel)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 8.8: 角色自反性
   * 任何角色都应该能够执行需要自己角色的操作
   */
  it('任何角色都应该能够执行需要自己角色的操作', () => {
    fc.assert(
      fc.property(
        roleArbitrary,
        (role) => {
          const hasPermission = checkPermission(role, role)
          expect(hasPermission).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 8.9: 严格层级顺序
   * 验证 SUPERMANAGE > MANAGE > EDITOR > USER 的严格顺序
   */
  it('应该维护严格的角色层级顺序', () => {
    const superLevel = getRoleLevel(UserTypeEnum.SUPERMANAGE)
    const manageLevel = getRoleLevel(UserTypeEnum.MANAGE)
    const editorLevel = getRoleLevel(UserTypeEnum.EDITOR)
    const userLevel = getRoleLevel(UserTypeEnum.USER)
    
    // 验证严格的大于关系
    expect(superLevel).toBeGreaterThan(manageLevel)
    expect(manageLevel).toBeGreaterThan(editorLevel)
    expect(editorLevel).toBeGreaterThan(userLevel)
    
    // 验证具体的数值
    expect(superLevel).toBe(4)
    expect(manageLevel).toBe(3)
    expect(editorLevel).toBe(2)
    expect(userLevel).toBe(1)
  })
  
  /**
   * 属性 8.10: 权限拒绝的反单调性
   * 如果高权限角色被拒绝，低权限角色也应该被拒绝
   */
  it('如果高权限角色被拒绝，低权限角色也应该被拒绝', () => {
    fc.assert(
      fc.property(
        roleArbitrary,
        roleArbitrary,
        roleArbitrary,
        (higherRole, lowerRole, requiredRole) => {
          const higherLevel = getRoleLevel(higherRole)
          const lowerLevel = getRoleLevel(lowerRole)
          
          // 只在 higherRole 确实比 lowerRole 高时测试
          if (higherLevel > lowerLevel) {
            const higherCanDo = checkPermission(higherRole, requiredRole)
            const lowerCanDo = checkPermission(lowerRole, requiredRole)
            
            // 如果高权限角色不能做，低权限角色也不能做
            if (!higherCanDo) {
              expect(lowerCanDo).toBe(false)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { UserTypeEnum } from '../types'
import { checkPermission, compareRoles, getRoleLevel } from './authorization'

describe('Authorization Utilities', () => {
  describe('Unit Tests', () => {
    describe('checkPermission', () => {
      it('should allow SUPERMANAGE to access all operations', () => {
        expect(checkPermission(UserTypeEnum.SUPERMANAGE, UserTypeEnum.SUPERMANAGE)).toBe(true)
        expect(checkPermission(UserTypeEnum.SUPERMANAGE, UserTypeEnum.MANAGE)).toBe(true)
        expect(checkPermission(UserTypeEnum.SUPERMANAGE, UserTypeEnum.EDITOR)).toBe(true)
        expect(checkPermission(UserTypeEnum.SUPERMANAGE, UserTypeEnum.USER)).toBe(true)
      })

      it('should allow MANAGE to access MANAGE, EDITOR, and USER operations', () => {
        expect(checkPermission(UserTypeEnum.MANAGE, UserTypeEnum.SUPERMANAGE)).toBe(false)
        expect(checkPermission(UserTypeEnum.MANAGE, UserTypeEnum.MANAGE)).toBe(true)
        expect(checkPermission(UserTypeEnum.MANAGE, UserTypeEnum.EDITOR)).toBe(true)
        expect(checkPermission(UserTypeEnum.MANAGE, UserTypeEnum.USER)).toBe(true)
      })

      it('should allow EDITOR to access EDITOR and USER operations', () => {
        expect(checkPermission(UserTypeEnum.EDITOR, UserTypeEnum.SUPERMANAGE)).toBe(false)
        expect(checkPermission(UserTypeEnum.EDITOR, UserTypeEnum.MANAGE)).toBe(false)
        expect(checkPermission(UserTypeEnum.EDITOR, UserTypeEnum.EDITOR)).toBe(true)
        expect(checkPermission(UserTypeEnum.EDITOR, UserTypeEnum.USER)).toBe(true)
      })

      it('should allow USER to access only USER operations', () => {
        expect(checkPermission(UserTypeEnum.USER, UserTypeEnum.SUPERMANAGE)).toBe(false)
        expect(checkPermission(UserTypeEnum.USER, UserTypeEnum.MANAGE)).toBe(false)
        expect(checkPermission(UserTypeEnum.USER, UserTypeEnum.EDITOR)).toBe(false)
        expect(checkPermission(UserTypeEnum.USER, UserTypeEnum.USER)).toBe(true)
      })
    })

    describe('getRoleLevel', () => {
      it('should return correct levels for all roles', () => {
        expect(getRoleLevel(UserTypeEnum.SUPERMANAGE)).toBe(4)
        expect(getRoleLevel(UserTypeEnum.MANAGE)).toBe(3)
        expect(getRoleLevel(UserTypeEnum.EDITOR)).toBe(2)
        expect(getRoleLevel(UserTypeEnum.USER)).toBe(1)
      })

      it('should maintain hierarchy order', () => {
        expect(getRoleLevel(UserTypeEnum.SUPERMANAGE)).toBeGreaterThan(
          getRoleLevel(UserTypeEnum.MANAGE)
        )
        expect(getRoleLevel(UserTypeEnum.MANAGE)).toBeGreaterThan(getRoleLevel(UserTypeEnum.EDITOR))
        expect(getRoleLevel(UserTypeEnum.EDITOR)).toBeGreaterThan(getRoleLevel(UserTypeEnum.USER))
      })
    })

    describe('compareRoles', () => {
      it('should return 1 when first role is higher', () => {
        expect(compareRoles(UserTypeEnum.SUPERMANAGE, UserTypeEnum.MANAGE)).toBe(1)
        expect(compareRoles(UserTypeEnum.MANAGE, UserTypeEnum.EDITOR)).toBe(1)
        expect(compareRoles(UserTypeEnum.EDITOR, UserTypeEnum.USER)).toBe(1)
      })

      it('should return -1 when first role is lower', () => {
        expect(compareRoles(UserTypeEnum.USER, UserTypeEnum.EDITOR)).toBe(-1)
        expect(compareRoles(UserTypeEnum.EDITOR, UserTypeEnum.MANAGE)).toBe(-1)
        expect(compareRoles(UserTypeEnum.MANAGE, UserTypeEnum.SUPERMANAGE)).toBe(-1)
      })

      it('should return 0 when roles are equal', () => {
        expect(compareRoles(UserTypeEnum.SUPERMANAGE, UserTypeEnum.SUPERMANAGE)).toBe(0)
        expect(compareRoles(UserTypeEnum.MANAGE, UserTypeEnum.MANAGE)).toBe(0)
        expect(compareRoles(UserTypeEnum.EDITOR, UserTypeEnum.EDITOR)).toBe(0)
        expect(compareRoles(UserTypeEnum.USER, UserTypeEnum.USER)).toBe(0)
      })
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
     *
     * 属性 8: 角色权限层级
     *
     * 对于任何操作，如果 USER 角色被拒绝访问，则 EDITOR、MANAGE 和 SUPERMANAGE 角色
     * 的权限检查结果应该保持一致或更宽松
     *
     * 这个属性验证了角色权限的单调性：更高级别的角色永远不会比低级别的角色拥有更少的权限
     */
    it('Property 8: Role permission hierarchy - Requirements 4.2, 4.3, 4.4, 4.5', () => {
      // 定义所有角色
      const allRoles = [
        UserTypeEnum.USER,
        UserTypeEnum.EDITOR,
        UserTypeEnum.MANAGE,
        UserTypeEnum.SUPERMANAGE,
      ]

      // 生成角色对的任意值
      const rolePairArbitrary = fc.tuple(fc.constantFrom(...allRoles), fc.constantFrom(...allRoles))

      fc.assert(
        fc.property(rolePairArbitrary, ([userRole, requiredRole]) => {
          // 获取权限检查结果
          const hasPermission = checkPermission(userRole, requiredRole)

          // 属性 1: 如果 USER 被拒绝访问某个操作，则更高级别的角色应该也被拒绝或被允许
          // 换句话说：如果一个角色有权限，那么所有更高级别的角色也应该有权限
          if (hasPermission) {
            // 检查所有更高级别的角色
            const userLevel = getRoleLevel(userRole)
            allRoles.forEach((higherRole) => {
              const higherLevel = getRoleLevel(higherRole)
              if (higherLevel > userLevel) {
                // 更高级别的角色必须也有权限
                expect(checkPermission(higherRole, requiredRole)).toBe(true)
              }
            })
          }

          // 属性 2: 权限检查的传递性
          // 如果 A >= B 且 B >= C，则 A >= C
          allRoles.forEach((intermediateRole) => {
            const canUserAccessIntermediate = checkPermission(userRole, intermediateRole)
            const canIntermediateAccessRequired = checkPermission(intermediateRole, requiredRole)

            if (canUserAccessIntermediate && canIntermediateAccessRequired) {
              // 如果用户可以访问中间角色，且中间角色可以访问所需角色
              // 那么用户应该可以访问所需角色
              expect(checkPermission(userRole, requiredRole)).toBe(true)
            }
          })

          // 属性 3: SUPERMANAGE 总是有权限
          expect(checkPermission(UserTypeEnum.SUPERMANAGE, requiredRole)).toBe(true)

          // 属性 4: 每个角色至少可以访问自己级别的操作
          expect(checkPermission(userRole, userRole)).toBe(true)

          // 属性 5: 如果 USER 被拒绝，验证层级一致性
          if (
            requiredRole !== UserTypeEnum.USER &&
            !checkPermission(UserTypeEnum.USER, requiredRole)
          ) {
            // USER 被拒绝访问非 USER 级别的操作
            // 验证更高级别的角色权限是一致的或更宽松的
            const editorHasPermission = checkPermission(UserTypeEnum.EDITOR, requiredRole)
            const manageHasPermission = checkPermission(UserTypeEnum.MANAGE, requiredRole)
            const supermanageHasPermission = checkPermission(UserTypeEnum.SUPERMANAGE, requiredRole)

            // SUPERMANAGE 总是有权限
            expect(supermanageHasPermission).toBe(true)

            // 如果 EDITOR 有权限，MANAGE 也应该有权限
            if (editorHasPermission) {
              expect(manageHasPermission).toBe(true)
            }
          }
        }),
        { numRuns: 100 }
      )
    })

    /**
     * 属性：角色级别的单调性
     *
     * 验证角色级别是严格单调递增的，没有两个不同的角色有相同的级别
     */
    it('Property: Role level monotonicity', () => {
      const allRoles = [
        UserTypeEnum.USER,
        UserTypeEnum.EDITOR,
        UserTypeEnum.MANAGE,
        UserTypeEnum.SUPERMANAGE,
      ]

      // 生成两个不同角色的任意值
      const differentRolesArbitrary = fc
        .tuple(fc.constantFrom(...allRoles), fc.constantFrom(...allRoles))
        .filter(([role1, role2]) => role1 !== role2)

      fc.assert(
        fc.property(differentRolesArbitrary, ([role1, role2]) => {
          const level1 = getRoleLevel(role1)
          const level2 = getRoleLevel(role2)

          // 不同的角色必须有不同的级别
          expect(level1).not.toBe(level2)

          // 比较结果必须与级别差异一致
          const comparison = compareRoles(role1, role2)
          if (level1 > level2) {
            expect(comparison).toBe(1)
          } else {
            expect(comparison).toBe(-1)
          }
        }),
        { numRuns: 50 }
      )
    })

    /**
     * 属性：权限检查的对称性
     *
     * 如果角色 A 可以访问角色 B 的操作，那么角色 B 不能访问角色 A 的操作
     * （除非它们是同一个角色）
     */
    it('Property: Permission check asymmetry', () => {
      const allRoles = [
        UserTypeEnum.USER,
        UserTypeEnum.EDITOR,
        UserTypeEnum.MANAGE,
        UserTypeEnum.SUPERMANAGE,
      ]

      const rolePairArbitrary = fc.tuple(fc.constantFrom(...allRoles), fc.constantFrom(...allRoles))

      fc.assert(
        fc.property(rolePairArbitrary, ([role1, role2]) => {
          const role1CanAccessRole2 = checkPermission(role1, role2)
          const role2CanAccessRole1 = checkPermission(role2, role1)

          if (role1 === role2) {
            // 相同角色，两者都应该有权限
            expect(role1CanAccessRole2).toBe(true)
            expect(role2CanAccessRole1).toBe(true)
          } else {
            // 不同角色，不能同时都有权限访问对方的操作
            // 只有更高级别的角色可以访问低级别的操作
            const level1 = getRoleLevel(role1)
            const level2 = getRoleLevel(role2)

            if (level1 > level2) {
              expect(role1CanAccessRole2).toBe(true)
              expect(role2CanAccessRole1).toBe(false)
            } else {
              expect(role1CanAccessRole2).toBe(false)
              expect(role2CanAccessRole1).toBe(true)
            }
          }
        }),
        { numRuns: 50 }
      )
    })

    /**
     * 属性：角色比较的一致性
     *
     * compareRoles 的结果必须与 checkPermission 的结果一致
     */
    it('Property: Role comparison consistency with permission check', () => {
      const allRoles = [
        UserTypeEnum.USER,
        UserTypeEnum.EDITOR,
        UserTypeEnum.MANAGE,
        UserTypeEnum.SUPERMANAGE,
      ]

      const rolePairArbitrary = fc.tuple(fc.constantFrom(...allRoles), fc.constantFrom(...allRoles))

      fc.assert(
        fc.property(rolePairArbitrary, ([userRole, requiredRole]) => {
          const comparison = compareRoles(userRole, requiredRole)
          const hasPermission = checkPermission(userRole, requiredRole)

          // 如果 userRole >= requiredRole (comparison >= 0)，则应该有权限
          if (comparison >= 0) {
            expect(hasPermission).toBe(true)
          } else {
            expect(hasPermission).toBe(false)
          }
        }),
        { numRuns: 50 }
      )
    })

    /**
     * 属性：SUPERMANAGE 的全能性
     *
     * SUPERMANAGE 角色必须能够访问所有操作，无论所需角色是什么
     */
    it('Property: SUPERMANAGE omnipotence', () => {
      const allRoles = [
        UserTypeEnum.USER,
        UserTypeEnum.EDITOR,
        UserTypeEnum.MANAGE,
        UserTypeEnum.SUPERMANAGE,
      ]

      fc.assert(
        fc.property(fc.constantFrom(...allRoles), (requiredRole) => {
          // SUPERMANAGE 必须能够访问任何级别的操作
          expect(checkPermission(UserTypeEnum.SUPERMANAGE, requiredRole)).toBe(true)

          // SUPERMANAGE 的级别必须是最高的
          expect(getRoleLevel(UserTypeEnum.SUPERMANAGE)).toBeGreaterThanOrEqual(
            getRoleLevel(requiredRole)
          )
        }),
        { numRuns: 50 }
      )
    })

    /**
     * 属性：USER 的最小权限
     *
     * USER 角色只能访问 USER 级别的操作，不能访问更高级别的操作
     */
    it('Property: USER minimal permissions', () => {
      const allRoles = [
        UserTypeEnum.USER,
        UserTypeEnum.EDITOR,
        UserTypeEnum.MANAGE,
        UserTypeEnum.SUPERMANAGE,
      ]

      fc.assert(
        fc.property(fc.constantFrom(...allRoles), (requiredRole) => {
          const hasPermission = checkPermission(UserTypeEnum.USER, requiredRole)

          if (requiredRole === UserTypeEnum.USER) {
            // USER 可以访问 USER 级别的操作
            expect(hasPermission).toBe(true)
          } else {
            // USER 不能访问更高级别的操作
            expect(hasPermission).toBe(false)
          }

          // USER 的级别必须是最低的
          expect(getRoleLevel(UserTypeEnum.USER)).toBeLessThanOrEqual(getRoleLevel(requiredRole))
        }),
        { numRuns: 50 }
      )
    })
  })
})

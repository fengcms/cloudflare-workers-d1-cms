import { UserTypeEnum } from '../types'

/**
 * 角色权限层级（从高到低）：
 * SUPERMANAGE > MANAGE > EDITOR > USER
 */

// 定义角色层级映射
const roleHierarchy: Record<UserTypeEnum, number> = {
  [UserTypeEnum.SUPERMANAGE]: 4,
  [UserTypeEnum.MANAGE]: 3,
  [UserTypeEnum.EDITOR]: 2,
  [UserTypeEnum.USER]: 1
}

/**
 * 检查用户角色是否有权限执行操作
 * @param userRole 用户的角色
 * @param requiredRole 操作所需的最低角色
 * @returns 是否有权限
 */
export function checkPermission(userRole: UserTypeEnum, requiredRole: UserTypeEnum): boolean {
  const userLevel = roleHierarchy[userRole]
  const requiredLevel = roleHierarchy[requiredRole]
  
  return userLevel >= requiredLevel
}

/**
 * 获取角色的权限级别
 * @param role 角色
 * @returns 权限级别（数字越大权限越高）
 */
export function getRoleLevel(role: UserTypeEnum): number {
  return roleHierarchy[role]
}

/**
 * 比较两个角色的权限级别
 * @param role1 角色1
 * @param role2 角色2
 * @returns 1 如果 role1 > role2, -1 如果 role1 < role2, 0 如果相等
 */
export function compareRoles(role1: UserTypeEnum, role2: UserTypeEnum): number {
  const level1 = roleHierarchy[role1]
  const level2 = roleHierarchy[role2]
  
  if (level1 > level2) return 1
  if (level1 < level2) return -1
  return 0
}

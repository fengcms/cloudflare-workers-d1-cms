/**
 * Audit Log Service
 * 
 * Manages audit logging for all state-changing operations.
 * Logs are immutable (write-only, no updates or deletes).
 * 
 * **Validates Requirements**: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { DrizzleD1Database } from 'drizzle-orm/d1'
import { logs } from '../db/schema'
import { Log, LogTypeEnum, ModuleEnum, CreateLogInput, LogQueryParams, PaginatedResult } from '../types'
import { calculatePagination, paginate, DEFAULT_PAGE_SIZE } from '../utils/pagination'

export class AuditLogService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * Create an audit log entry
   * 
   * Records a state-changing operation with user, action, resource details.
   * Logs are immutable once created.
   * 
   * @param data - Log entry data
   * @returns Created log entry
   * 
   * **Validates Requirements**: 8.1, 8.2, 8.3
   */
  async log(data: CreateLogInput): Promise<Log> {
    const now = new Date()
    
    const [result] = await this.db
      .insert(logs)
      .values({
        user_id: data.user_id ?? null,
        
        username: data.username ?? '',
        type: data.type,
        module: data.module,
        content: data.content,
        ip: data.ip ?? '',
        user_agent: data.user_agent ?? '',
        site_id: data.site_id ?? null,
        created_at: now
      })
      .returning()
    
    return result
  }

  /**
   * Query audit logs with filtering and pagination
   * 
   * Supports filtering by userId, action type, module, date range, and siteId.
   * Results are ordered by created_at descending (newest first).
   * 
   * @param params - Query parameters with filters and pagination
   * @returns Paginated audit log results
   * 
   * **Validates Requirements**: 8.5
   */
  async query(params: LogQueryParams): Promise<PaginatedResult<Log>> {
    const {
      userId,
      type,
      module,
      startDate,
      endDate,
      filters = {},
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE
    } = params

    // Build WHERE conditions
    const conditions = []

    // Filter by user_id
    if (userId !== undefined) {
      conditions.push(eq(logs.user_id, userId))
    }

    // Filter by type (action)
    if (type !== undefined) {
      conditions.push(eq(logs.type, type))
    }

    // Filter by module (resourceType)
    if (module !== undefined) {
      conditions.push(eq(logs.module, module))
    }

    // Filter by site_id
    if (filters.site_id !== undefined) {
      conditions.push(eq(logs.site_id, filters.site_id))
    }

    // Filter by date range
    if (startDate !== undefined) {
      conditions.push(gte(logs.created_at, startDate))
    }

    if (endDate !== undefined) {
      conditions.push(lte(logs.created_at, endDate))
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const countResult = await this.db
      .select({ count: logs.id })
      .from(logs)
      .where(whereClause)
      .all()
    
    const totalCount = countResult.length

    // Calculate pagination
    const { offset, limit } = calculatePagination(page, pageSize, totalCount)

    // Query with pagination
    const results = await this.db
      .select()
      .from(logs)
      .where(whereClause)
      .orderBy(desc(logs.created_at))
      .limit(limit)
      .offset(offset)
      .all()

    return paginate(results, page, pageSize, totalCount)
  }
}

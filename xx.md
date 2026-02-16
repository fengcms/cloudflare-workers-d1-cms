# Requirements Document

## Introduction

The Cloudflare CMS API is a multi-site article management system backend API built on Cloudflare Workers. The system provides complete content management capabilities including articles, channels, users, dictionaries, advertisements, and audit logging. Each site's data is completely isolated, and the system enforces role-based access control with JWT authentication.

## Glossary

- **System**: The Cloudflare CMS API
- **Site**: A logical tenant in the multi-site system, identified by site_id
- **Article**: A content item with rich text or markdown body
- **Channel**: A hierarchical category for organizing articles
- **User**: An authenticated account with a specific role
- **Dictionary**: A collection of metadata entries (authors, sources, tags, friend links)
- **Advertisement**: A time-based promotional content item
- **Audit_Log**: A record of system operations for compliance and debugging
- **JWT_Token**: JSON Web Token used for authentication
- **R2**: Cloudflare's object storage service
- **D1**: Cloudflare's SQLite-compatible database
- **KV**: Cloudflare's key-value storage service

## Requirements

### Requirement 1: Multi-Site Isolation

**User Story:** As a platform administrator, I want complete data isolation between sites, so that each tenant's data remains private and secure.

#### Acceptance Criteria

1. WHEN any data query is executed, THE System SHALL filter results by the site_id from the Site-Id header
2. WHEN a user creates any resource, THE System SHALL associate it with the site_id from the Site-Id header
3. WHEN a Site-Id header is missing, THE System SHALL reject the request with an authentication error
4. WHEN a user attempts to access resources from a different site, THE System SHALL return an empty result set
5. THE System SHALL enforce site_id filtering at the database query level for all tables

### Requirement 2: Article Management

**User Story:** As a content editor, I want to create and manage articles with rich content, so that I can publish content to my site.

#### Acceptance Criteria

1. WHEN a user creates an article, THE System SHALL store the title, content, channel_id, author, source, tags, and metadata
2. WHEN an article is created, THE System SHALL set is_deleted to false and record created_at timestamp
3. WHEN a user updates an article, THE System SHALL modify the specified fields and update the updated_at timestamp
4. WHEN a user deletes an article, THE System SHALL set is_deleted to true without removing the record
5. WHEN querying articles, THE System SHALL exclude records where is_deleted is true
6. THE System SHALL support both rich text and markdown content formats
7. WHEN an article is published, THE System SHALL validate that the associated channel exists for the same site_id

### Requirement 3: Hierarchical Channel System

**User Story:** As a content manager, I want to organize articles into hierarchical channels, so that content is properly categorized.

#### Acceptance Criteria

1. WHEN a user creates a channel, THE System SHALL store the name, parent_id, sort_order, and site_id
2. WHEN a parent_id is provided, THE System SHALL validate that the parent channel exists for the same site_id
3. WHEN querying channels, THE System SHALL support retrieving the full hierarchy tree
4. WHEN a channel is deleted, THE System SHALL set is_deleted to true without removing the record
5. THE System SHALL allow channels to have unlimited nesting depth
6. WHEN sorting channels, THE System SHALL order by sort_order field in ascending order

### Requirement 4: Role-Based Access Control

**User Story:** As a system administrator, I want to control user permissions through roles, so that users can only perform authorized operations.

#### Acceptance Criteria

1. THE System SHALL support four roles: SUPERMANAGE, MANAGE, EDITOR, and USER
2. WHEN a user with SUPERMANAGE role performs any operation, THE System SHALL allow it
3. WHEN a user with MANAGE role attempts site-level operations, THE System SHALL allow it
4. WHEN a user with EDITOR role attempts content operations, THE System SHALL allow it
5. WHEN a user with USER role attempts administrative operations, THE System SHALL reject the request
6. WHEN a JWT token is validated, THE System SHALL extract the user role and enforce permissions
7. THE System SHALL validate role permissions before executing any state-changing operation

### Requirement 5: User Management

**User Story:** As a site administrator, I want to manage user accounts, so that I can control who has access to the system.

#### Acceptance Criteria

1. WHEN a user is created, THE System SHALL hash the password using a secure algorithm
2. WHEN a user is created, THE System SHALL store username, email, role, site_id, and hashed password
3. WHEN a user updates their profile, THE System SHALL allow modification of username, email, and password
4. WHEN a password is updated, THE System SHALL hash the new password before storage
5. WHEN a user is deleted, THE System SHALL set is_deleted to true without removing the record
6. THE System SHALL enforce unique username per site_id
7. THE System SHALL enforce unique email per site_id

### Requirement 6: Dictionary System

**User Story:** As a content editor, I want to manage reusable metadata like authors and tags, so that I can maintain consistent content attribution.

#### Acceptance Criteria

1. THE System SHALL support four dictionary types: author, source, tag, and friend_link
2. WHEN a dictionary entry is created, THE System SHALL store the type, name, value, and site_id
3. WHEN querying dictionary entries, THE System SHALL filter by type and site_id
4. WHEN a dictionary entry is deleted, THE System SHALL set is_deleted to true without removing the record
5. THE System SHALL allow multiple dictionary entries with the same name but different types
6. WHEN a friend_link dictionary entry is created, THE System SHALL store the URL in the value field

### Requirement 7: Advertisement Management

**User Story:** As a marketing manager, I want to schedule advertisements with time-based display, so that promotions appear at the right time.

#### Acceptance Criteria

1. WHEN an advertisement is created, THE System SHALL store title, content, image_url, link_url, start_time, end_time, and site_id
2. WHEN querying active advertisements, THE System SHALL return only ads where current time is between start_time and end_time
3. WHEN querying advertisements, THE System SHALL exclude records where is_deleted is true
4. WHEN an advertisement is deleted, THE System SHALL set is_deleted to true without removing the record
5. THE System SHALL support sorting advertisements by sort_order field

### Requirement 8: Audit Logging

**User Story:** As a compliance officer, I want complete audit logs of all operations, so that I can track system usage and investigate issues.

#### Acceptance Criteria

1. WHEN any state-changing operation occurs, THE System SHALL create an audit log entry
2. WHEN creating an audit log, THE System SHALL record user_id, action, resource_type, resource_id, site_id, and timestamp
3. WHEN creating an audit log, THE System SHALL store the request details and response status
4. THE System SHALL log all CREATE, UPDATE, and DELETE operations
5. WHEN querying audit logs, THE System SHALL support filtering by user_id, action, resource_type, and date range
6. THE System SHALL never delete audit log entries

### Requirement 9: JWT Authentication

**User Story:** As a developer, I want secure token-based authentication, so that API access is protected.

#### Acceptance Criteria

1. WHEN a user logs in with valid credentials, THE System SHALL generate a JWT token
2. WHEN generating a JWT token, THE System SHALL include user_id, username, role, and site_id in the payload
3. WHEN a request includes an Authorization header, THE System SHALL validate the JWT token
4. WHEN a JWT token is invalid or expired, THE System SHALL reject the request with an authentication error
5. THE System SHALL sign JWT tokens with a secure secret key
6. WHEN validating a JWT token, THE System SHALL verify the signature and expiration

### Requirement 10: Password Security

**User Story:** As a security officer, I want passwords to be securely stored, so that user credentials are protected.

#### Acceptance Criteria

1. WHEN a password is stored, THE System SHALL hash it using bcrypt or equivalent algorithm
2. WHEN a user logs in, THE System SHALL compare the provided password against the stored hash
3. THE System SHALL never store passwords in plain text
4. THE System SHALL never return password hashes in API responses
5. WHEN a password hash comparison fails, THE System SHALL reject the login attempt

### Requirement 11: Image Upload to R2

**User Story:** As a content editor, I want to upload images for articles, so that I can include visual content.

#### Acceptance Criteria

1. WHEN a user uploads an image, THE System SHALL store it in Cloudflare R2
2. WHEN storing an image, THE System SHALL generate a unique filename to prevent collisions
3. WHEN an image upload succeeds, THE System SHALL return the public URL
4. THE System SHALL validate that uploaded files are image types
5. WHEN an image upload fails, THE System SHALL return a descriptive error message
6. THE System SHALL associate uploaded images with the site_id

### Requirement 12: Universal Query Specification

**User Story:** As an API consumer, I want flexible query capabilities, so that I can retrieve exactly the data I need.

#### Acceptance Criteria

1. WHEN a query includes filter parameters, THE System SHALL apply exact match filtering
2. WHEN a query includes sort parameters, THE System SHALL order results by the specified field
3. WHEN a query includes page and page_size parameters, THE System SHALL return paginated results
4. WHEN a query includes a search parameter, THE System SHALL perform fuzzy matching on text fields
5. WHEN a query includes comparison operators (gt, lt, gte, lte), THE System SHALL apply the appropriate comparison
6. THE System SHALL support combining multiple query parameters in a single request
7. WHEN pagination is applied, THE System SHALL return total count metadata

### Requirement 13: Unified Response Format

**User Story:** As an API consumer, I want consistent response formats, so that I can reliably parse responses.

#### Acceptance Criteria

1. WHEN an operation succeeds, THE System SHALL return a JSON response with success status and data
2. WHEN an operation fails, THE System SHALL return a JSON response with error status and message
3. THE System SHALL use consistent field names across all endpoints
4. WHEN returning lists, THE System SHALL include pagination metadata (total, page, page_size)
5. THE System SHALL use HTTP status codes that match the response status (200 for success, 400/401/403/500 for errors)

### Requirement 14: Database Indexing

**User Story:** As a system administrator, I want optimized database queries, so that the API performs well under load.

#### Acceptance Criteria

1. THE System SHALL create indexes on site_id for all multi-tenant tables
2. THE System SHALL create indexes on is_deleted for all soft-delete tables
3. THE System SHALL create indexes on foreign key columns (channel_id, user_id, parent_id)
4. THE System SHALL create indexes on timestamp columns used for filtering (created_at, start_time, end_time)
5. THE System SHALL create composite indexes for common query patterns (site_id + is_deleted)

### Requirement 15: Caching Strategy

**User Story:** As a system administrator, I want frequently accessed data to be cached, so that response times are minimized.

#### Acceptance Criteria

1. WHEN querying channel hierarchies, THE System SHALL cache results in Cloudflare KV
2. WHEN querying active advertisements, THE System SHALL cache results in Cloudflare KV
3. WHEN cached data is modified, THE System SHALL invalidate the relevant cache entries
4. THE System SHALL set appropriate TTL values for cached data
5. WHEN a cache miss occurs, THE System SHALL fetch from D1 and populate the cache

### Requirement 16: Soft Delete Implementation

**User Story:** As a compliance officer, I want deleted records to be retained, so that we can recover data if needed.

#### Acceptance Criteria

1. THE System SHALL add an is_deleted boolean column to all primary tables
2. WHEN a delete operation is requested, THE System SHALL set is_deleted to true
3. WHEN querying records, THE System SHALL exclude records where is_deleted is true by default
4. THE System SHALL provide administrative endpoints to query deleted records
5. THE System SHALL never physically delete records from primary tables

### Requirement 17: API Versioning

**User Story:** As an API consumer, I want stable API versions, so that my integrations don't break unexpectedly.

#### Acceptance Criteria

1. THE System SHALL prefix all API endpoints with /api/v1/
2. WHEN introducing breaking changes, THE System SHALL create a new version prefix
3. THE System SHALL maintain backward compatibility within a major version
4. WHEN a deprecated endpoint is called, THE System SHALL include a deprecation warning in response headers

### Requirement 18: Error Handling

**User Story:** As a developer, I want descriptive error messages, so that I can quickly diagnose issues.

#### Acceptance Criteria

1. WHEN a validation error occurs, THE System SHALL return a 400 status with field-specific error messages
2. WHEN an authentication error occurs, THE System SHALL return a 401 status with a clear message
3. WHEN an authorization error occurs, THE System SHALL return a 403 status with a clear message
4. WHEN a resource is not found, THE System SHALL return a 404 status with a clear message
5. WHEN an internal error occurs, THE System SHALL return a 500 status and log the error details
6. THE System SHALL never expose sensitive information in error messages

### Requirement 19: Request Validation

**User Story:** As a system administrator, I want all inputs to be validated, so that invalid data doesn't enter the system.

#### Acceptance Criteria

1. WHEN a request is received, THE System SHALL validate required fields are present
2. WHEN a request is received, THE System SHALL validate field types match the schema
3. WHEN a request is received, THE System SHALL validate field lengths are within limits
4. WHEN a request is received, THE System SHALL validate email addresses match a valid format
5. WHEN validation fails, THE System SHALL return all validation errors in a single response
6. THE System SHALL sanitize all text inputs to prevent injection attacks

### Requirement 20: Timestamp Management

**User Story:** As a data analyst, I want accurate timestamps on all records, so that I can track data lifecycle.

#### Acceptance Criteria

1. WHEN a record is created, THE System SHALL set created_at to the current UTC timestamp
2. WHEN a record is updated, THE System SHALL set updated_at to the current UTC timestamp
3. THE System SHALL store all timestamps in UTC timezone
4. THE System SHALL use ISO 8601 format for timestamp serialization
5. WHEN a record is soft-deleted, THE System SHALL set deleted_at to the current UTC timestamp

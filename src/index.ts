import { Hono } from 'hono'
import { errorHandler } from './middleware/errorHandler'
import users from './routes/users'
import channels from './routes/channels'
import dictionaries from './routes/dictionaries'
import promos from './routes/promos'
import articles from './routes/articles'
import images from './routes/images'

// Define the environment bindings
export interface Env {
  DB: D1Database
  IMAGES: R2Bucket
  CACHE: KVNamespace
  JWT_SECRET: string
  JWT_EXPIRATION: string
  ENVIRONMENT: 'development' | 'staging' | 'production'
  PUBLIC_DOMAIN?: string
  MAX_UPLOAD_SIZE?: number
  CACHE_TTL?: number
}

const app = new Hono<{ Bindings: Env }>()

// 注册全局错误处理中间件
app.onError(errorHandler)

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString()
  })
})

// API version endpoint
app.get('/api/v1', (c) => {
  return c.json({
    version: 'v1',
    name: 'Cloudflare CMS API',
    description: 'Multi-site content management system API'
  })
})

// 注册用户路由
app.route('/api/v1/user', users)

// 注册频道路由
app.route('/api/v1/channel', channels)

// 注册字典路由
app.route('/api/v1/dict', dictionaries)

// 注册推广路由
app.route('/api/v1/promo', promos)

// 注册文章路由
app.route('/api/v1/article', articles)

// 注册图片上传路由
app.route('/api/v1', images)

export default app

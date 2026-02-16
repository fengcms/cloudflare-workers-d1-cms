# 一个基于 cloudflare workers 的文章管理系统后台 api 项目设计。

项目提供接口为 JSON 格式，支持多个文章站点从本后端接口提供数据。

接口风格为 RESTFul 风格

接口前缀为 /api/v1/

## 技术选型

开发语言 TypeScript

运行环境， Cloudflare Workers

数据库 Cloudflare D1

缓存 Cloudflare KV

图片等资源存储 Cloudflare R2

基于 Hono + drizzle-orm 来构建整个项目。

使用 biome 来规范项目代码，代码风格为 Standard Style

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
# 生成数据库迁移文件
npm run db:generate

# 应用数据库迁移
npm run db:migrate

# 启动开发服务器
npm run dev
```

### 部署

```bash
# 部署到预发布环境
npm run deploy:staging

# 部署到生产环境
npm run deploy:production
```

### 测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

## 数据库设计

### Site 站点信息表

id                  自增ID                        必填
name                站点名称                       必填
title               站点标题
logo                站点LOGO                        可为空字符串
keywords            站点关键词                      TEXT
description         站点描述                        TEXT
copyright           站点版权信息                      TEXT
status              状态                        默认为 PENDING 待审核状态，NORMAL 为通过审核,FAILURE 为未通过审核 ,DELETE 为已删除
created_at          创建时间
update_at           更新时间

### Article 文章数据表

id                  自增ID                        必填
title               文章标题                       必填
channel_id          文章归属栏目ID                  归属栏目ID，必填
tags                文章关键词                      是一个 string[] 可以根据 tag 来对文章进行搜索
description         文章描述                        简要介绍，可空字符串
content             文章正文，富文本                正文，如果用户提交的是 Markdown 格式的，自动转换为富文本，并存储到此字段
markdown            文章正文，Markdown 格式         正文，如果用户直接提交的是富文本，则留空
img                 文章封面图片                    可空字符串
video               文章视频                        可空字符串
author              文章作者名                      直接填写，可为空，如果为空且 author_id 有数据，则为 author_id 对应的 name，如果 author_id 为空，但 user_id 有数据，则为 user 的 name，
author_id           文章作者ID                      作者 ID，可为空
origin              文章来源                        直接填写，可为空，如果 origin_id 有数据，则为 origin_id 对应的 name。
origin_id           文章来源ID                      可为空
editor_id           文章所属编辑ID                  可为空
user_id             文章用户ID                      提交文章的用户ID，可以为空
type                文章类型                        默认为 NORMAL，可自定其他类型如 HOT | MEDIA 等，便于根据 type 进行归类
status              文章状态                        默认为 PENDING 待审核状态，NORMAL 为通过审核,FAILURE 为未通过审核 ,DELETE 为已删除
is_top              文章是否置顶                     默认为 0，可选值 1，分别代表在排序时，是否置顶
site_id             文章归属站点ID 
created_at          文章创建时间
update_at           文章更新时间

### Channel 栏目数据表

id                  自增ID                        必填
name                栏目名称                       必填
pid                 父栏目ID                        int 类型，默认为0，表示是顶级栏目
sort                排序                            int 类型，默认为 0，用于栏目排序
keywords            关键词                          字符串，可为空
description         栏目描述                        TEXT， 可为空
type                栏目类型                        默认为 ARTICLE 后期可能拓展自他类型的内容数据，暂时没想好，先默认为 ARTICLE 即可
status              状态                        默认为 PENDING 待审核状态，NORMAL 为通过审核,FAILURE 为未通过审核 ,DELETE 为已删除
img                 封面图片                    可空字符串
site_id             归属站点ID
created_at          创建时间
update_at           更新时间

### User 用户数据表

id                  自增ID                        必填
name                栏目名称                       必填
account             登录账号                        必填，同一个 site_id 下，禁止重复
password            登录密码                        必填
salt                密码盐                          在创建用户的时候，随机一个盐值，用于取密码的 hash 值
evm_address         EVM地址                         可为空，如果用户有配置该参数，可实现利用 MetaMask 签名，实现免输入密码登录，同一个 site_id 下，禁止重复
type                用户类型                        SUPERMANAGE | MANAGE | EDITOR | USER
level               用户等级                        int 类型，默认为 1，标识用户 VIP 等级。
avatar              用户头像                        字符串，可为空字符串
mark                用户签名                        TEXT，用户自定义签名，可为空字符串
gender              用户性别                        'MALE', 'FEMALE', 'UNKNOWN' 默认为 UNKNOWN
mobile              用户手机号码                    可为空字符串
email               电子邮箱                        可为空字符串
website             用户自己的站点网址                  可为空字符串
status              用户状态                        默认为 PENDING 待审核状态，NORMAL 为通过审核,FAILURE 为未通过审核 ,DELETE 为已删除
editor              用户编辑器类型                  RICHTEXT | MARKDOWN 默认为 MARKDOWN
site_id             归属站点ID
created_at          创建时间
update_at           更新时间

### Dicts 系统字典表

系统字典表，提供各种常用的内容

id                  自增ID                        必填
name                名称                          必填
type                类型                          AUTHOR | ORIGIN | TAG | FRIENDLINK
link                关联链接                        可为空字符串
status              状态                        默认为 PENDING 待审核状态，NORMAL 为通过审核,FAILURE 为未通过审核 ,DELETE 为已删除
site_id             归属站点ID
created_at          创建时间
update_at           更新时间


### Promo 广告系统表

id                  自增ID                        必填
name                名称                          必填
url                 广告链接                        可为空字符串
img                 广告图片                        可为空字符串
content             广告内容                        TEXT，允许存入JS代码字符串
status              状态                        默认为 PENDING 待审核状态， NORMAL 为通过审核,FAILURE 为未通过审核 ,DELETE 为已删除
site_id             归属站点ID                      
created_at          创建时间
update_at           更新时间

### Logs 日志数据表

id                  自增ID                        必填
type                操作类型                            POST | PUT | DELETE
table_name          操作数据表名称
data_id             操作数据的ID
user_id             操作用户的ID
ip                  操作用户的IP地址
site_id             归属站点ID                      
created_at          创建时间


## 权限说明

SUPERMANAGE 超级管理员，拥有全部数据的管理权限
MANAGE      管理员，拥有某个 site_id 的所有数据的管理权
EDITOR      文章编辑员，只拥有 Article 表的权限，且只有其  site_id 对应的数据的增删改的权限
USER        普通用户，只拥有 Article 表的权限，且只有其  site_id 和 user_id 对应的数据的增删改的权限
UNLOGGED    未登录用户，仅具有允许的表的查询权限

Article Channel Dicts Promo 等数据表的查询权限，面向所有人开放


## 接口设计

接口风格为 RESTFul 风格
接口前缀为 /api/v1/

基础返回结构

```ts
// 成功基础返回结构
{
    code: 200, // 状态码，200 为成功，其他为失败
    data: {} // 数据体
}
// 失败基础返回结构

{
    code: 400, // 状态码，400 为失败，其他为成功
    msg: '错误信息' // 错误信息
}
```

在返回 httpCode 时，只要是服务器正常处理的，都返回 200 状态码。
如果服务器处理失败，但是还是能正常相应，依然是返回 200 状态码。具体的失败 code ，在返回数据中返回。
也就是说，客户端读取到失败的 httpCode，就说明是真正的网络失败。

/xxx        类型接口，支持 GET 和 POST 方法。 GET 为获取该接口列表分页数据。POST 为新增数据。

GET         在权限允许的范围内，可以根据传参在数据库内查询数据。
            如 /xxx?status='NORMAL' ，则返回所有状态为 NORMAL 的数据。
            允许一些特殊查询方法。
            如 title-like=xxx ，则返回所有 title 中包含 xxx 的数据。
            如 id-neq=10 ，则返回所有 id 不等于 10 的数据。
            如 id-in=1,2,3 ，则返回所有 id 为 1,2,3 的数据。
            如 id-gt=10 ，则返回所有 id 大于 10 的数据。
            如 id-gte=10 ，则返回所有 id 大于等于 10 的数据。
            如 id-lt=10 ，则返回所有 id 小于 10 的数据。
            如 id-lte=10 ，则返回所有 id 小于等于 10 的数据。
            如 id-nin=1,2,3 ，则返回所有 id 不在 1,2,3 中的数据。
            如 content-nil ，则返回所有 content 为空字符串的 数据。
            如 content-nnil ，则返回所有 content 不为空字符串的 数据。
            除了根据数据表存在的字段进行查询，还定义某些特殊的查询参数。
            如 sort=id ，则根据 id 字段排序，升序。
            如 sort=-id ，则根据 id 字段排序，降序。
            如 sort=-id,sort 则根据 id 降序排序，按照 sort 字段升序排序。 sort 为空时，默认根据 id 倒序排序。
            如 page=0 ，则返回第一页数据。
            如 page=1 ，则返回第二页数据。
            如 page=2 ，则返回第三页数据。
            以此类推。
            如 pagesize=20 ，则返回 20 条数据。
            如 time=1694502400000 ，则返回该时间戳对应的 UTC 时间的当天的24小时内的数据。
            如 time=1694502400000-1694588800000 ，则返回该时间戳范围内的所有数据。

```ts
// 分页数据返回结果
{
    total: 100, // 总数据条数
    page: 0, // 当前页码
    pagesize: 10, // 每页数据条数
    list: [
        // 数据列表
    ]
}
```

/xxx/{id}   类型接口，支持 GET PUT 和 DELETE 方法。
            GET 为获取 该 ID 数据
            PUT 为根据 BODY 新数据，修改该ID数据
            DELETE 方法，将该ID数据的 status 设置为 DELETE 标识为删除。

---

/site
GET          返回站点数据库列表，只有 SUPERMANAGE 有权限
POST         新增站点数据，只有 SUPERMANAGE 有权限

/site/{id}

GET         返回该ID的站点信息，除了 SUPERMANAGE 和 MANAGE 有权限查看所有 status 的数据，其他权限只能查看 status 为 NORMAL 的数据。
            如果请求ID存在，但站点 status 不为 NORMAL，且请求者的权限不为 SUPERMANAGE 或 MANAGE，返回 404
PUT         SUPERMANAGE 有权限。 MANAGE 仅有 其 site_id 与请求ID一致，才有修改权限
POST        仅支持 SUPERMANAGE


---

### 用户注册

POST /api/v1/register        注册接口

```ts
// Request
{
    username: 'xxxx',
    password: 'xxxx',
    nickname: 'xxxx',
    email: 'xxx@example.com',  // 可选
    evm_address: '0x1234...'   // 可选
}
// Response
{
    code: 201,
    data: {
        token: 'xxx',
        user: {
            id: 1,
            username: 'xxx',
            nickname: 'xxx',
            type: 'USER',
            // ... 其他用户信息（不包含 password）
        }
    }
}
```

用户注册，使用 JWT 认证。
注册成功后自动登录，返回 JWT token。后续请求需要在 header 中带上 Authorization: Bearer xxx 来进行认证。
用户注册的 password 使用 bcryptjs 进行哈希加密后存储。
注册的用户默认为 USER 类型。

---

### 用户登录

POST /api/v1/login        普通登录接口

```ts
// Request
{
    username: 'xxxx',
    password: 'xxxx'
}
// Response
{
    code: 200,
    data: {
        token: 'xxx',
        user: {
            id: 1,
            username: 'xxx',
            nickname: 'xxx',
            type: 'USER',
            // ... 其他用户信息（不包含 password）
        }
    }
}
```

用户登录，使用 JWT 认证。
登录成功后，返回的 token 为 JWT 认证的 token，后续请求需要在 header 中带上 Authorization: Bearer xxx 来进行认证。
用户登录的 password 使用 bcryptjs 进行哈希验证。

---

### EVM 钱包登录

GET /api/v1/login/nonce  获取登录 nonce

```ts
// Response
{
    code: 200,
    data: {
        message: 'Sign this message to login: nonce_xxx_timestamp_xxx',
        timestamp: 1234567890
    }
}
```

POST /api/v1/login/evm  钱包签名登录

```ts
// Request
{
    signature: '0xabcd...',
    message: 'Sign this message to login: nonce_xxx_timestamp_xxx'
}
// Response
{
    code: 200,
    data: {
        token: 'xxx',
        user: {
            id: 1,
            username: 'xxx',
            evm_address: '0x1234...',
            // ... 其他用户信息
        }
    }
}
```

EVM 钱包登录流程：
1. 前端调用 `/api/v1/login/nonce` 获取登录消息
2. 用户使用 MetaMask 等钱包对消息进行签名
3. 前端将签名和消息发送到 `/api/v1/login/evm`
4. 后端验证签名，恢复地址，查找用户并返回 JWT token

签名验证使用 EIP-191 标准，消息格式包含 nonce 和时间戳，防止重放攻击。
时间戳有效期为 5 分钟。

---

### 文章管理

GET  /api/v1/article

获取文章列表。

除 SUPERMANAGE 以外，其他权限者请求该接口，必须带上 Site-Id 请求头。

默认按照ID倒序返回 status 为 NORMAL 的数据。

查询参数：
- page: 页码（从 1 开始）
- pageSize: 每页数据条数（默认 20）
- title-like: 标题模糊查询
- channel_id: 频道ID过滤
- tags-like: 标签搜索
- status: 状态过滤（UNLOGGED 仅支持 NORMAL，USER 支持 NORMAL/PENDING/FAILURE，MANAGE 和 SUPERMANAGE 支持所有状态）
- type: 文章类型过滤
- sort: 排序（如 -id 表示ID降序）

POST /api/v1/article

新增文章。

- 权限：USER, EDITOR, MANAGE, SUPERMANAGE
- 逻辑：
    - USER 权限用户提交时，status 强制设为 PENDING
    - EDITOR 及以上权限提交时，可指定 status
    - 若前端传入 markdown 字段，后端需调用转换服务将其转为 HTML 存入 content；若直接传入 content，markdown 字段留空
    - author_id, origin_id, editor_id, user_id 根据当前登录用户信息自动填充或校验

PUT /api/v1/article/{id}

更新文章。

- 权限：
    - SUPERMANAGE：可更新所有文章
    - MANAGE：仅可更新所属 site_id 的文章
    - EDITOR：仅可更新所属 site_id 且 editor_id 或 user_id 为自身的文章
    - USER：仅可更新 user_id 为自身的文章，且只能修改 status 为 PENDING 的文章

DELETE /api/v1/article/{id}

软删除文章。

- 权限：同 PUT 权限逻辑
- 逻辑：将 status 置为 DELETE，并记录日志

---

### 频道管理

GET /api/v1/channel

获取栏目列表。

- 权限：所有人均可访问，但 UNLOGGED 仅返回 status='NORMAL' 的数据
- 参数：
    - parent_id: 可选，获取某父栏目下的子栏目

GET /api/v1/channel/tree

获取树形结构的栏目数据。

POST /api/v1/channel

新增栏目。

- 权限：MANAGE, SUPERMANAGE

GET /api/v1/channel/{id}

获取栏目详情。

PUT /api/v1/channel/{id}

更新栏目。

- 权限：MANAGE (仅限自身站点), SUPERMANAGE

DELETE /api/v1/channel/{id}

软删除栏目。

---

### 用户管理

GET /api/v1/user

获取用户列表。

- 权限：MANAGE (仅限自身站点), SUPERMANAGE
- 参数：支持 username-like, type, status 等查询

POST /api/v1/user

创建用户（管理接口）。

- 权限：MANAGE, SUPERMANAGE

PUT /api/v1/user/{id}

更新用户信息。

- 权限：MANAGE (仅限自身站点，不可修改 SUPERMANAGE), SUPERMANAGE，或用户本人
- 逻辑：普通用户只能修改自己的 nickname, avatar 等信息，不可修改 type, status

DELETE /api/v1/user/{id}

删除用户（软删除）。

- 权限：MANAGE, SUPERMANAGE

---

### 字典管理

GET /api/v1/dict

获取字典数据。

- 参数：
    - type: 必填，如 AUTHOR | ORIGIN | TAG | FRIENDLINK

POST /api/v1/dict

新增字典项。

- 权限：EDITOR, MANAGE, SUPERMANAGE

PUT /api/v1/dict/{id}

更新字典项。

DELETE /api/v1/dict/{id}

软删除字典项。

---

### 推广管理

GET /api/v1/promo

获取广告列表。

GET /api/v1/promo/active

获取当前时间范围内的活动推广。

POST /api/v1/promo

新增广告。

- 权限：MANAGE, SUPERMANAGE

PUT /api/v1/promo/{id}

更新广告。

- 权限：MANAGE, SUPERMANAGE

PUT /api/v1/promo/{id}/toggle

切换推广的启用/禁用状态。

- 权限：MANAGE, SUPERMANAGE

DELETE /api/v1/promo/{id}

软删除广告。

---

### 图片上传

POST /api/v1/upload

上传图片文件接口，返回文件的公开访问 URL。

文件上传后，根据文件内容，取 sha256 哈希值，作为文件名。这样可以避免同一个文件被上传多次，导致重复存储。

- 权限：需登录
- Content-Type: multipart/form-data
- 逻辑：
    - 接收文件流
    - 校验文件类型（如仅允许 image/jpeg, image/png, image/gif, image/webp, image/svg+xml, image/bmp）
    - 生成文件名：{sha256}.{file_ext}
    - 存储至 Cloudflare R2
    - 返回文件的公开访问 URL

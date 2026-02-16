# Biome 代码格式化工具使用指南

## 简介

Biome 是一个快速的代码格式化和 lint 工具，用于替代 ESLint 和 Prettier。它提供了更快的性能和更好的开发体验。

## 安装

Biome 已经作为开发依赖安装在项目中：

```bash
npm install --save-dev --save-exact @biomejs/biome
```

## 配置

项目配置文件位于 `biome.json`，主要配置包括：

### 格式化配置
- **缩进**: 2 个空格
- **行宽**: 100 字符
- **引号**: 单引号
- **分号**: 按需添加（asNeeded）
- **尾随逗号**: ES5 风格

### Lint 配置
- 启用推荐规则
- 禁用 `noExplicitAny`（允许使用 any 类型）
- 强制使用 `const`（useConst: error）
- 警告非空断言（noNonNullAssertion: warn）

### 忽略文件
- `node_modules`
- `dist`
- `.wrangler`
- `drizzle`
- `coverage`

## 可用命令

### 格式化代码

```bash
# 格式化所有文件并写入
npm run format

# 检查格式但不写入（用于 CI）
npm run format:check
```

### Lint 代码

```bash
# Lint 所有文件并自动修复
npm run lint

# 检查 lint 问题但不修复（用于 CI）
npm run lint:check
```

### 完整检查

```bash
# 运行格式化、lint 和导入排序，并自动修复
npm run check

# CI 模式：检查所有问题但不修复
npm run check:ci
```

## 使用场景

### 1. 开发过程中

在编写代码时，定期运行格式化和 lint：

```bash
npm run check
```

### 2. 提交代码前

在提交代码前，确保代码符合规范：

```bash
npm run check
```

### 3. CI/CD 流程

在 CI/CD 流程中，检查代码质量：

```bash
npm run check:ci
```

## VS Code 集成

### 安装扩展

1. 打开 VS Code
2. 搜索并安装 "Biome" 扩展
3. 重启 VS Code

### 配置自动格式化

在 `.vscode/settings.json` 中添加：

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

## 命令详解

### format
格式化代码，包括：
- 统一缩进和空格
- 统一引号风格
- 统一分号使用
- 统一尾随逗号

### lint
检查代码质量问题，包括：
- 未使用的变量
- 可疑的代码模式
- 代码风格问题
- 潜在的错误

### check
综合命令，包括：
- 格式化
- Lint
- 导入排序
- 自动修复所有可修复的问题

### ci
CI 模式，用于持续集成：
- 检查格式问题
- 检查 lint 问题
- 检查导入排序
- 不修复任何问题
- 如果有问题则返回非零退出码

## 与其他工具对比

### vs Prettier
- **性能**: Biome 比 Prettier 快 25 倍
- **配置**: 单一配置文件
- **功能**: 同时支持格式化和 lint

### vs ESLint
- **性能**: Biome 比 ESLint 快 10 倍
- **配置**: 更简单的配置
- **功能**: 内置格式化功能

## 常见问题

### Q: 如何忽略特定文件？
A: 在 `biome.json` 的 `files.ignore` 数组中添加文件或目录。

### Q: 如何禁用特定规则？
A: 在 `biome.json` 的 `linter.rules` 中设置规则为 "off"。

### Q: 如何在代码中忽略特定行？
A: 使用注释：
```typescript
// biome-ignore lint/suspicious/noExplicitAny: 需要使用 any 类型
const data: any = {}
```

### Q: 格式化后代码风格不符合预期？
A: 检查 `biome.json` 中的格式化配置，调整相关选项。

## 最佳实践

1. **提交前检查**: 在提交代码前运行 `npm run check`
2. **编辑器集成**: 安装 VS Code 扩展，启用保存时自动格式化
3. **CI 集成**: 在 CI 流程中运行 `npm run check:ci`
4. **团队协作**: 确保所有团队成员使用相同的 Biome 配置
5. **渐进式采用**: 可以先在新代码中使用，逐步迁移旧代码

## 迁移指南

### 从 ESLint/Prettier 迁移

如果项目之前使用 ESLint 和 Prettier：

1. 备份现有配置
2. 运行迁移命令：
   ```bash
   npx @biomejs/biome migrate eslint
   npx @biomejs/biome migrate prettier
   ```
3. 检查生成的 `biome.json`
4. 删除旧的配置文件（可选）
5. 运行 `npm run check` 格式化所有代码

## 参考资源

- [Biome 官方文档](https://biomejs.dev/)
- [Biome GitHub](https://github.com/biomejs/biome)
- [配置参考](https://biomejs.dev/reference/configuration/)
- [规则列表](https://biomejs.dev/linter/rules/)

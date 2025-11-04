# File Hasher - Sidecar 插件示例

这是一个基于 Rust 的 Sidecar 插件示例，用于计算文件的 SHA-256 哈希值。

## 功能特性

- ✅ 计算文件 SHA-256 哈希
- ✅ 独立进程运行，不影响主应用性能
- ✅ 支持多平台编译（Windows、macOS、Linux）
- ✅ 通过 JSON-RPC 与主应用通信
- ✅ 完整的 Vue UI 界面
- ✅ 支持开发和生产环境

## 开发环境

### 前置要求

- Rust 1.70+ 及 Cargo
- Node.js 18+ (用于构建脚本)
- Bun (推荐) 或 npm

### 开发模式

在开发模式下，插件无需构建即可使用：

```bash
# 编译当前平台的 Rust debug 版本
cargo build

# 或使用 npm script
bun run build:rust
```

- ✅ `FileHasher.vue` 由 Vite 直接处理
- ✅ Rust 二进制文件从 `target/<triple>/debug/` 加载
- ✅ 支持 HMR 热重载（Vue 部分）

编译产物路径示例：
- Windows x64: `target/x86_64-pc-windows-msvc/debug/file-hasher.exe`
- macOS ARM64: `target/aarch64-apple-darwin/debug/file-hasher`
- Linux x64: `target/x86_64-unknown-linux-gnu/debug/file-hasher`

主应用在开发模式下会直接从 `plugins/example-file-hasher/` 目录加载此插件。

## 生产构建

### 单平台构建

构建当前平台的 release 版本：

```bash
bun run build:release
```

### 多平台构建

在 CI/CD 环境中构建所有支持的平台：

```bash
bun run build:all
```

这会自动：
1. 为所有平台编译二进制文件
2. 将它们复制到 `dist/bin/` 目录
3. 生成适配生产环境的 `manifest.json`

### 打包发布

生成可分发的插件包：

```bash
# 1. 安装依赖
bun install

# 2. 打包插件
bun run package
```

这会执行以下操作：

1. **编译 Vue 组件**：`FileHasher.vue` → `FileHasher.js`
2. **编译 Rust release 版本**（当前平台）
3. **创建 `dist/` 目录**，包含：
   ```
   dist/
   ├── bin/
   │   ├── file-hasher-windows-x64.exe
   │   ├── file-hasher-macos-arm64
   │   ├── file-hasher-linux-x64
   │   └── ...
   ├── FileHasher.js      (编译后的 Vue 组件)
   ├── manifest.json      (生产环境配置，.vue → .js)
   └── README.md
   ```
4. **生成 `.zip` 压缩包**：`file-hasher-v0.1.0.zip`

生产环境的 `manifest.json` 中，可执行文件路径会更新为：

```json
{
  "sidecar": {
    "executable": {
      "win32-x64": "bin/file-hasher-windows-x64.exe",
      "darwin-arm64": "bin/file-hasher-macos-arm64",
      "linux-x64": "bin/file-hasher-linux-x64"
    }
  }
}
```

**最终产物**：
- `dist/` - 未压缩的插件目录
- `file-hasher-v0.1.0.zip` - 可直接分发的压缩包（与 CI 构建产物格式一致）

## 插件使用

在主应用中调用此插件：

```typescript
import { executor } from '@/services';

// 计算文件哈希
const result = await executor.execute({
  service: 'file-hasher',
  method: 'calculateHash',
  params: {
    path: '/path/to/file.txt'
  }
});

console.log('SHA-256:', result.hash);
```

## 通信协议

Sidecar 插件通过 `stdin/stdout` 与主应用通信。

### 输入 (通过命令行参数)

```bash
file-hasher --path "/path/to/file.txt"
```

### 输出 (JSON Lines 格式)

成功响应：
```json
{"type":"result","data":{"hash":"abc123..."}}
```

错误响应：
```json
{"type":"error","message":"文件不存在"}
```

进度更新（可选）：
```json
{"type":"progress","percent":50,"message":"正在计算..."}
```

## 目录结构

```
example-file-hasher/
├── src/
│   └── main.rs                    # Rust 源码
├── target/                        # Cargo 构建产物（开发）
│   └── <triple>/
│       └── debug/
│           └── file-hasher[.exe]
├── dist/                          # 打包产物（生产，gitignore）
│   ├── bin/
│   │   └── file-hasher-*.{exe,}
│   ├── FileHasher.js              # 编译后的 Vue 组件
│   └── manifest.json
├── dist-ui/                       # Vue 构建产物（临时）
│   └── FileHasher.js
├── file-hasher-v0.1.0.zip         # 发布包（gitignore）
├── FileHasher.vue                 # UI 组件（开发模式）
├── build.js                       # 多平台构建脚本
├── vite.config.js                 # Vue 组件构建配置
├── Cargo.toml                     # Rust 项目配置
├── manifest.json                  # 插件清单（开发环境使用 .vue）
├── package.json                   # 构建命令 + 依赖
└── README.md
```

## 支持的平台

- Windows (x64, ARM64)
- macOS (x64, ARM64/Apple Silicon)
- Linux (x64, ARM64)

## 许可证

MIT
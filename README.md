# File Hasher - Sidecar 插件示例

> [!NOTE]
> **本插件是 [AIO Hub](https://github.com/miaotouy/aio-hub) 的插件示例。**

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
- `cargo-watch` (自动编译工具)
- Node.js 18+ (用于构建脚本)
- Bun (推荐) 或 npm

### 安装 cargo-watch

首次开发前需要安装 `cargo-watch`：

```bash
cargo install cargo-watch
```

**如果遇到 Rust 版本问题**（例如 `requires rustc 1.88`），可以选择：

**方法 1：升级 Rust（推荐）**
```bash
rustup update
```

**方法 2：使用锁定版本安装**
```bash
cargo install cargo-watch --locked
```

### 开发模式 - 自动重载

**推荐方式：使用 `cargo-watch` 实现自动编译**

```bash
# 启动自动监视模式（推荐）
bun run dev

# 或直接使用 cargo-watch
cargo watch -x build
```

当 Rust 源代码（`src/` 目录）发生变化时，`cargo-watch` 会自动重新编译 debug 版本：

- ✅ **Rust 部分自动编译**：`cargo-watch` 监视 `src/` 目录，代码变化时自动执行 `cargo build`
- ✅ **Vue 部分热重载**：`FileHasher.vue` 由 Vite 直接处理，支持 HMR
- ✅ **无需手动重启**：下次调用插件时自动使用新编译的二进制文件

**与 Tauri 的区别**：
- Tauri 后端是**常驻进程**，需要杀进程重启
- Sidecar 插件是**一次性执行**，每次调用都启动新进程
- 因此修改代码后，**下次调用时自动使用新版本**，无需重启任何进程 🎉

**适用场景**：
- ✅ 适合：独立的计算任务（如文件哈希、数据转换）
- ⚠️ 不适合：需要保持状态的常驻服务（如 WebSocket 服务器、数据库连接池）

如果未来需要常驻进程，建议使用独立的后端服务 + HTTP/WebSocket 通信，而非 Sidecar 模式。

### 开发模式 - 手动编译

如果不需要自动重载，也可以手动编译：

```bash
# 编译当前平台的 Rust debug 版本
cargo build

# 或使用 npm script
bun run build:rust
```

### 独立测试

如果需要独立测试 Rust 二进制文件（不通过主应用）：

```bash
# 编译并运行
bun run dev:test

# 或手动执行
cargo build && cargo run
```

### 编译产物路径

Rust 二进制文件会输出到：
- Windows x64: `target/x86_64-pc-windows-msvc/debug/file-hasher.exe`
- macOS ARM64: `target/aarch64-apple-darwin/debug/file-hasher`
- Linux x64: `target/x86_64-unknown-linux-gnu/debug/file-hasher`

主应用在开发模式下会直接从 `plugins/example-file-hasher/target/<triple>/debug/` 目录加载二进制文件。

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
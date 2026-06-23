# AGENTS.md - File Hasher 示例插件协作规范

## 插件定位

- 本仓库是 AIO Hub 的独立示例插件仓库，插件 ID 为 `file-hasher`。
- 插件类型为 `sidecar`，用于演示文件哈希计算和进度输出。
- `manifest.json` 声明的唯一方法是 `calculateHash`，参数为文件路径和可选哈希算法。
- 这是示例插件，但仍要保持 manifest、UI、sidecar 协议和打包脚本可作为参考。

## 关键文件

- `manifest.json` 是插件 ID、方法、sidecar 可执行文件和 UI 的事实来源。
- `src/main.rs` 是单次 sidecar 入口，从 stdin 读取一行 JSON，向 stdout 输出 `progress` / `result` / `error` JSON。
- `FileHasher.vue` 是 UI 入口，`components/` 下拆分 Header、Stats、FileList、FileItem 等展示组件。
- `Cargo.toml` 定义 Rust 哈希依赖，当前支持 SHA-224、SHA-256、SHA-384、SHA-512。
- `package.json` 定义构建脚本；本仓库脚本当前使用 `node build.js` 和裸 `vite build`，不要想当然改成 Bun 命令。

## 实现约束

- sidecar stdout 是协议输出，必须保持单行 JSON。
- 进度事件、结果事件和错误事件的 `type` 字段不能随意改名，否则宿主侧进度展示会失效。
- 新增哈希算法时，同步更新 Rust 分支、UI 选项、README 和 `manifest.json` 方法说明。
- 处理大文件时保持流式读取，不要一次性把文件全部读入内存。

## 命令

- 优先按当前 `package.json` 脚本执行，不要擅自换包管理器或脚本风格。
- 构建插件：`bun run build`，该脚本内部调用 `node build.js`。
- Rust 调试构建：`bun run build:rust`
- Rust 发布构建：`bun run build:rust:release`
- Vue UI 构建：`bun run build:vue`
- 打包：`bun run package`
- 清理：`bun run clean`

本仓库是独立 Git 仓库，提交应在本目录内完成。

## 验证重点

- Rust 哈希逻辑改动至少运行 `bun run build:rust`。
- UI 改动至少运行 `bun run build:vue` 或 `bun run build`。
- 协议或方法签名变化后，确认 `manifest.json` 和 `src/main.rs` 同步。
- 真实文件选择、进度和 sidecar 调用需要在 AIO Hub Tauri 运行态验证。

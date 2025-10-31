/**
 * Sidecar 插件多平台构建脚本
 * 用于编译 Rust 二进制文件并打包成插件包
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 支持的目标平台
const TARGETS = {
  'windows-x64': { 
    rustTarget: 'x86_64-pc-windows-msvc',
    executable: 'file-hasher.exe',
    manifestKey: 'win32-x64'
  },
  'windows-arm64': { 
    rustTarget: 'aarch64-pc-windows-msvc',
    executable: 'file-hasher.exe',
    manifestKey: 'win32-arm64'
  },
  'macos-x64': { 
    rustTarget: 'x86_64-apple-darwin',
    executable: 'file-hasher',
    manifestKey: 'darwin-x64'
  },
  'macos-arm64': { 
    rustTarget: 'aarch64-apple-darwin',
    executable: 'file-hasher',
    manifestKey: 'darwin-arm64'
  },
  'linux-x64': { 
    rustTarget: 'x86_64-unknown-linux-gnu',
    executable: 'file-hasher',
    manifestKey: 'linux-x64'
  },
  'linux-arm64': { 
    rustTarget: 'aarch64-unknown-linux-gnu',
    executable: 'file-hasher',
    manifestKey: 'linux-arm64'
  }
};

const CURRENT_PLATFORM = process.platform === 'win32' ? 'windows' :
                         process.platform === 'darwin' ? 'macos' : 'linux';
const CURRENT_ARCH = process.arch === 'x64' ? 'x64' : 'arm64';
const CURRENT_TARGET_KEY = `${CURRENT_PLATFORM}-${CURRENT_ARCH}`;

// 解析命令行参数
const args = process.argv.slice(2);
const mode = args.includes('--release') ? 'release' : 'debug';
const targetArg = args.find(arg => arg.startsWith('--target='));
const targetPlatform = targetArg ? targetArg.split('=')[1] : CURRENT_TARGET_KEY;

console.log('🔨 构建 Sidecar 插件: file-hasher');
console.log(`   模式: ${mode}`);
console.log(`   目标平台: ${targetPlatform}`);
console.log('');

// 构建单个目标
function buildTarget(targetKey) {
  const target = TARGETS[targetKey];
  if (!target) {
    console.error(`❌ 未知目标平台: ${targetKey}`);
    console.log('   支持的平台:', Object.keys(TARGETS).join(', '));
    process.exit(1);
  }

  console.log(`📦 构建 ${targetKey}...`);
  
  try {
    // 安装目标工具链（如果需要）
    console.log(`   安装 Rust 目标: ${target.rustTarget}`);
    execSync(`rustup target add ${target.rustTarget}`, { 
      stdio: 'inherit',
      cwd: __dirname 
    });

    // 构建
    const buildCmd = mode === 'release'
      ? `cargo build --release --target ${target.rustTarget}`
      : `cargo build --target ${target.rustTarget}`;
    
    console.log(`   执行: ${buildCmd}`);
    execSync(buildCmd, { 
      stdio: 'inherit',
      cwd: __dirname 
    });

    console.log(`✅ ${targetKey} 构建完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${targetKey} 构建失败:`, error.message);
    return false;
  }
}

// 打包插件
function packagePlugin() {
  console.log('');
  console.log('📦 打包插件...');

  const distDir = path.join(__dirname, 'dist');
  const binDir = path.join(distDir, 'bin');

  // 清理并创建输出目录
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(binDir, { recursive: true });

  // 复制编译产物
  let copiedCount = 0;
  for (const [targetKey, target] of Object.entries(TARGETS)) {
    const binaryPath = path.join(
      __dirname, 
      'target', 
      target.rustTarget, 
      mode, 
      target.executable
    );

    if (fs.existsSync(binaryPath)) {
      const destFileName = `file-hasher-${targetKey}${path.extname(target.executable)}`;
      const destPath = path.join(binDir, destFileName);
      
      fs.copyFileSync(binaryPath, destPath);
      console.log(`   ✓ 复制 ${targetKey} -> bin/${destFileName}`);
      copiedCount++;
    }
  }

  if (copiedCount === 0) {
    console.error('❌ 没有找到任何构建产物');
    process.exit(1);
  }

  // 生成生产环境的 manifest.json
  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8')
  );

  // 更新可执行文件路径为生产环境路径
  manifest.sidecar.executable = {};
  for (const [targetKey, target] of Object.entries(TARGETS)) {
    const fileName = `file-hasher-${targetKey}${path.extname(target.executable)}`;
    if (fs.existsSync(path.join(binDir, fileName))) {
      manifest.sidecar.executable[target.manifestKey] = `bin/${fileName}`;
    }
  }

  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('   ✓ 生成 manifest.json (生产环境)');

  // 复制 README（如果存在）
  const readmePath = path.join(__dirname, 'README.md');
  if (fs.existsSync(readmePath)) {
    fs.copyFileSync(readmePath, path.join(distDir, 'README.md'));
    console.log('   ✓ 复制 README.md');
  }

  console.log('');
  console.log(`✅ 插件已打包到: ${distDir}`);
  console.log('');
  console.log('📁 包结构:');
  console.log('   file-hasher/');
  console.log('   ├── bin/');
  fs.readdirSync(binDir).forEach(file => {
    console.log(`   │   └── ${file}`);
  });
  console.log('   └── manifest.json');
}

// 主流程
async function main() {
  if (args.includes('--all')) {
    // 构建所有平台（仅在 CI 环境中推荐）
    console.log('🌍 构建所有支持的平台...');
    console.log('');
    
    const results = Object.keys(TARGETS).map(buildTarget);
    const successCount = results.filter(r => r).length;
    
    console.log('');
    console.log(`✅ 完成: ${successCount}/${Object.keys(TARGETS).length} 个平台构建成功`);
    
    if (successCount > 0) {
      packagePlugin();
    }
  } else {
    // 构建指定平台
    const success = buildTarget(targetPlatform);
    
    if (success && args.includes('--package')) {
      packagePlugin();
    }
  }
}

main().catch(error => {
  console.error('构建失败:', error);
  process.exit(1);
});
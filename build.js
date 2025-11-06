/**
 * Sidecar 插件多平台构建脚本
 * 用于编译 Rust 二进制文件并打包成插件包
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

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

// 构建 Vue 组件
function buildVueComponent() {
  console.log('📦 构建 Vue 组件...');
  
  try {
    execSync('vite build', {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    console.log('✅ Vue 组件构建完成');
    return true;
  } catch (error) {
    console.error('❌ Vue 组件构建失败:', error.message);
    return false;
  }
}

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

  // 确保输出目录存在
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

  // 加载 manifest.json
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

  // 验证 Vue 组件并更新 manifest
  if (manifest.ui && manifest.ui.component) {
    const componentFileName = manifest.ui.component;
    const componentBaseName = path.basename(componentFileName, '.vue');
    const componentJsName = `${componentBaseName}.js`;
    
    const componentJsPath = path.join(distDir, componentJsName);
    if (!fs.existsSync(componentJsPath)) {
      console.error(`❌ 找不到编译后的 ${componentJsName} 文件，请确认 Vue 组件已成功构建`);
      process.exit(1);
    }
    console.log(`   ✓ 发现 ${componentJsName}`);
    manifest.ui.component = componentJsName;
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
  
  return distDir;
}

// 创建 ZIP 压缩包
async function createZipArchive(distDir) {
  console.log('');
  console.log('🗜️  创建 ZIP 压缩包...');

  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8')
  );
  
  const pluginId = manifest.id;
  const version = manifest.version;
  const zipFileName = `${pluginId}-v${version}.zip`;
  const zipPath = path.join(__dirname, zipFileName);

  // 删除旧的 zip 文件
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
    console.log(`   ✓ 删除旧版本: ${zipFileName}`);
  }

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高压缩级别
    });

    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`   ✓ 压缩包大小: ${sizeInMB} MB`);
      console.log('');
      console.log(`✅ 发布包已创建: ${zipFileName}`);
      console.log(`   路径: ${zipPath}`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // 将 dist/ 目录的内容打包（不包含 dist/ 本身）
    archive.directory(distDir, false);

    archive.finalize();
  });
}

// 主流程
async function main() {
  // 清理旧的构建产物
  console.log('🧹 清理旧的构建产物...');
  const distDir = path.join(__dirname, 'dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  const distUiDir = path.join(__dirname, 'dist-ui');
  if (fs.existsSync(distUiDir)) {
    fs.rmSync(distUiDir, { recursive: true });
  }
  const manifestData = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'));
  const zipFileName = `${manifestData.id}-v${manifestData.version}.zip`;
  const zipPath = path.join(__dirname, zipFileName);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  console.log('✅ 清理完成');
  console.log('');

  // 先构建 Vue 组件
  const vueSuccess = buildVueComponent();
  if (!vueSuccess) {
    // 如果 Vue 组件构建失败，则直接退出，因为它是 UI 的一部分
    console.error('❌ Vue 组件构建失败，无法继续。');
    process.exit(1);
  }

  if (args.includes('--all')) {
    // 构建所有平台（仅在 CI 环境中推荐）
    console.log('');
    console.log('🌍 构建所有支持的平台...');
    console.log('');
    
    const results = Object.keys(TARGETS).map(buildTarget);
    const successCount = results.filter(r => r).length;
    
    console.log('');
    console.log(`✅ 完成: ${successCount}/${Object.keys(TARGETS).length} 个平台构建成功`);
    
    if (successCount > 0) {
      const distDir = packagePlugin();
      
      // 创建 zip 压缩包
      if (args.includes('--package')) {
        await createZipArchive(distDir);
      }
    }
  } else {
    // 构建指定平台
    const success = buildTarget(targetPlatform);
    
    if (success && args.includes('--package')) {
      const distDir = packagePlugin();
      await createZipArchive(distDir);
    }
  }
}

main().catch(error => {
  console.error('构建失败:', error);
  process.exit(1);
});
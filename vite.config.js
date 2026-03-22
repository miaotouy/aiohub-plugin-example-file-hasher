import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  plugins: [
    vue(),
    {
      name: 'aiohub-alias-resolver',
      enforce: 'pre',
      resolveId(source) {
        if (source.startsWith('@/')) {
          // 映射规则：将内部源码引用重定向到 SDK 或 UI 外部模块
          const isUI = source.includes('/components/') || source.includes('/tools/');
          return { id: isUI ? 'aiohub-ui' : 'aiohub-sdk', external: true };
        }
        return null;
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      'aiohub-sdk': resolve(__dirname, '../../src/services/plugin-sdk'),
      'aiohub-ui': resolve(__dirname, '../../src/services/plugin-ui')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'FileHasher.vue'),
      name: 'FileHasher',
      fileName: 'FileHasher',
      formats: ['es']
    },
    rollupOptions: {
      // 外部化依赖，不打包进组件
      external: [
        'vue',
        '@tauri-apps/api/core',
        '@tauri-apps/plugin-dialog',
        '@tauri-apps/plugin-clipboard-manager',
        'aiohub-sdk',
        'aiohub-ui',
        'fsevents'
      ],
      output: {
        // 保持导入路径
        globals: {
          vue: 'Vue'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: false // 主构建脚本负责清理
  }
});
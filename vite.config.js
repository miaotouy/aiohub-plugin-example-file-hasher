import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
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
        'element-plus',
        '@element-plus/icons-vue',
        '@tauri-apps/api/core',
        '@tauri-apps/plugin-dialog',
        '@tauri-apps/plugin-clipboard-manager',
        'fsevents',  // macOS 专用依赖，在其他平台需要外部化
        /^@\//  // 所有 @/ 开头的导入（主应用提供）
      ],
      output: {
        // 保持导入路径
        globals: {
          vue: 'Vue',
          'element-plus': 'ElementPlus'
        }
      }
    },
    outDir: 'dist-ui',
    emptyOutDir: true
  }
});
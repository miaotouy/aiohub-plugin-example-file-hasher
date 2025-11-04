<template>
  <div class="file-hasher-container">
    <!-- 顶部操作栏 -->
    <HeaderSection
      v-model:algorithm="algorithm"
      v-model:auto-calculate="autoCalculate"
      :files-count="files.length"
      :success-count="successCount"
      :is-calculating="isCalculating"
      @select-files="selectFiles"
      @calculate-all="calculateAllFiles"
      @copy-all="copyAllHashes"
      @clear-all="clearAll"
    />

    <!-- 主内容区域 -->
    <el-row :gutter="12" class="content-section">
      <!-- 左侧：文件列表 -->
      <el-col :span="19">
        <FileListSection
          ref="fileListRef"
          :files="files"
          :auto-calculate="autoCalculate"
          @copy-hash="copyFileHash"
          @recalculate="calculateSingleFile"
          @remove="removeFile"
        />
      </el-col>

      <!-- 右侧：结果统计 -->
      <el-col :span="5">
        <StatsSection
          :files-count="files.length"
          :success-count="successCount"
          :calculating-count="calculatingCount"
          :pending-count="pendingCount"
          :error-count="errorCount"
          :algorithm-label="algorithmLabel"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { customMessage } from '@/utils/customMessage';
import { listen } from '@tauri-apps/api/event';
import HeaderSection from './components/HeaderSection.vue';
import FileListSection from './components/FileListSection.vue';
import StatsSection from './components/StatsSection.vue';
import type { FileItem } from './components/FileItem.vue';

// 动态导入
const { execute } = await import('@/services/executor.ts');

const files = ref<FileItem[]>([]);
const algorithm = ref('sha256');
const autoCalculate = ref(true);
const isCalculating = ref(false);
const fileListRef = ref<InstanceType<typeof FileListSection> | null>(null);

// 计算属性
const algorithmLabel = computed(() => {
  const labels: Record<string, string> = {
    'sha256': 'SHA-256',
    'sha512': 'SHA-512',
    'md5': 'MD5'
  };
  return labels[algorithm.value] || algorithm.value.toUpperCase();
});

const successCount = computed(() =>
  files.value.filter(f => f.status === 'success').length
);

const calculatingCount = computed(() =>
  files.value.filter(f => f.status === 'calculating').length
);

const pendingCount = computed(() =>
  files.value.filter(f => f.status === 'pending').length
);

const errorCount = computed(() =>
  files.value.filter(f => f.status === 'error').length
);

// 选择文件
const selectFiles = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: true,
      title: '选择要计算哈希的文件'
    });
    
    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      addFiles(paths);
    }
  } catch (err: any) {
    customMessage.error('选择文件失败');
  }
};

// 添加文件到列表
const addFiles = (paths: string[]) => {
  const newFiles: FileItem[] = paths.map((path) => {
    const name = path.split(/[/\\]/).pop() || path;
    return { path, name, status: 'pending' };
  });

  const uniqueNewFiles = newFiles.filter((nf) =>
    !files.value.some((sf) => sf.path === nf.path)
  );
  
  if (uniqueNewFiles.length > 0) {
    files.value.push(...uniqueNewFiles);
    customMessage.success(`已添加 ${uniqueNewFiles.length} 个文件`);
    
    // 如果开启自动计算，立即计算
    if (autoCalculate.value) {
      calculateNewFiles(uniqueNewFiles);
    }
  }
};

// 计算新添加的文件
const calculateNewFiles = async (newFiles: FileItem[]) => {
  for (const file of newFiles) {
    await calculateSingleFile(file);
  }
};

// 计算单个文件
const calculateSingleFile = async (file: FileItem) => {
  // 找到数组中的实际索引，确保响应式更新
  const index = files.value.findIndex(f => f.path === file.path);
  if (index === -1) {
    console.warn('[FileHasher] 未找到文件:', file.path);
    return;
  }
  
  // 通过索引直接修改数组中的对象，确保响应式追踪
  files.value[index].status = 'calculating';
  files.value[index].hash = undefined;
  files.value[index].error = undefined;

  try {
    const result = await execute({
      service: 'file-hasher',
      method: 'calculateHash',
      params: {
        path: file.path,
        algorithm: algorithm.value
      }
    });
    
    console.log('[FileHasher] 收到结果:', result);
    
    if (result.success) {
      // result.data 就是哈希值字符串本身
      console.log('[FileHasher] 成功，设置哈希值:', result.data);
      files.value[index].hash = result.data;
      files.value[index].status = 'success';
      console.log('[FileHasher] 文件状态已更新:', files.value[index].status, files.value[index].hash);
    } else {
      console.log('[FileHasher] 失败:', result.error);
      files.value[index].error = result.error.message || '计算哈希失败';
      files.value[index].status = 'error';
    }
  } catch (err: any) {
    console.log('[FileHasher] 捕获错误:', err);
    files.value[index].error = err.message || '计算哈希失败';
    files.value[index].status = 'error';
  }
};

// 批量计算所有文件
const calculateAllFiles = async () => {
  if (files.value.length === 0) {
    customMessage.warning('请先添加文件');
    return;
  }

  isCalculating.value = true;
  
  try {
    for (const file of files.value) {
      if (file.status !== 'success') {
        await calculateSingleFile(file);
      }
    }
    customMessage.success('批量计算完成');
  } finally {
    isCalculating.value = false;
  }
};

// 复制文件哈希值
const copyFileHash = async (file: FileItem) => {
  if (!file.hash) return;
  
  try {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(file.hash);
    customMessage.success('已复制到剪贴板');
  } catch (err) {
    customMessage.error('复制失败');
  }
};

// 复制所有哈希值
const copyAllHashes = async () => {
  const successFiles = files.value.filter(f => f.status === 'success' && f.hash);
  
  if (successFiles.length === 0) {
    customMessage.warning('没有可复制的哈希值');
    return;
  }
  
  // 格式：文件名: 哈希值
  const content = successFiles
    .map(f => `${f.name}: ${f.hash}`)
    .join('\n');
  
  try {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(content);
    customMessage.success(`已复制 ${successFiles.length} 个哈希值`);
  } catch (err) {
    customMessage.error('复制失败');
  }
};

// 移除文件
const removeFile = (index: number) => {
  files.value.splice(index, 1);
};

// 清空所有
const clearAll = () => {
  if (files.value.length === 0) return;
  files.value = [];
  customMessage.success('已清空文件列表');
};
// ===== 拖拽处理 =====
// Tauri 后端事件监听器清理函数
let unlistenDrop: (() => void) | null = null;

// 设置 Tauri 后端的文件拖放监听器
const setupFileDropListener = async () => {
  // 监听文件放下事件
  unlistenDrop = await listen('custom-file-drop', async (event: any) => {
    const { paths } = event.payload;
    
    // 清除高亮状态
    fileListRef.value?.clearDragState();
    
    if (!paths || (Array.isArray(paths) && paths.length === 0)) {
      return;
    }
    
    const pathArray = Array.isArray(paths) ? paths : [paths];
    addFiles(pathArray);
  });
};

// 生命周期钩子
onMounted(() => {
  setupFileDropListener();
});

onUnmounted(() => {
  unlistenDrop?.();
});
</script>

<style scoped>
.file-hasher-container {
  padding: 20px;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: var(--text-color);
  box-sizing: border-box;
}

.file-hasher-container * {
  box-sizing: border-box;
}

/* 内容区域 */
.content-section {
  flex: 1;
  min-height: 0;
}

.content-section .el-col {
  height: 100%;
}
</style>
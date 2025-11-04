<template>
  <div class="file-hasher-container">
    <!-- 顶部操作栏 -->
    <el-card shadow="never" class="box-card header-section">
      <div class="header-content">
        <div class="algorithm-selector">
          <span class="selector-label">哈希算法</span>
          <el-radio-group v-model="algorithm" size="large">
            <el-radio-button value="sha256">SHA-256</el-radio-button>
            <el-radio-button value="sha512">SHA-512</el-radio-button>
            <el-radio-button value="md5">MD5</el-radio-button>
          </el-radio-group>
        </div>
        <div class="header-actions">
          <el-checkbox v-model="autoCalculate" label="自动计算" />
          <el-button @click="selectFiles" type="primary" :icon="FolderOpened">
            选择文件
          </el-button>
          <el-button
            @click="calculateAllFiles"
            type="success"
            :icon="Checked"
            :disabled="files.length === 0"
            :loading="isCalculating"
          >
            批量计算
          </el-button>
          <el-button @click="clearAll" :icon="Delete" plain>
            清空列表
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 主内容区域 -->
    <el-row :gutter="20" class="content-section">
      <!-- 左侧：文件列表 -->
      <el-col :span="14">
        <el-card shadow="never" class="box-card file-list-card">
          <template #header>
            <div class="card-header">
              <span>文件列表</span>
              <el-tag type="info" size="small">{{ files.length }} 个文件</el-tag>
            </div>
          </template>
          <div
            class="drop-area"
            :class="{ dragover: isDragging }"
            @dragover.prevent="handleDragOver"
            @drop.prevent="handleDrop"
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
          >
            <div v-if="isDragging" class="drag-overlay">
              <el-icon class="drag-icon"><Upload /></el-icon>
              <p>拖拽文件到此处</p>
            </div>

            <el-scrollbar v-if="files.length > 0" class="file-list-scrollbar">
              <div class="file-list">
                <div
                  v-for="(file, index) in files"
                  :key="file.path"
                  class="file-item"
                  :class="{ 'is-calculating': file.status === 'calculating' }"
                >
                  <el-icon class="file-icon">
                    <Document />
                  </el-icon>
                  <div class="file-details">
                    <div class="file-name" :title="file.name">{{ file.name }}</div>
                    <div class="file-path" :title="file.path">{{ file.path }}</div>
                    <div v-if="file.status !== 'pending'" class="file-status-row">
                      <span class="file-status" :class="`status-${file.status}`">
                        {{ getStatusText(file.status) }}
                      </span>
                      <span v-if="file.hash" class="file-hash-preview">
                        {{ file.hash.substring(0, 16) }}...
                      </span>
                    </div>
                  </div>
                  <div class="file-actions">
                    <el-button
                      v-if="file.status === 'success'"
                      @click="copyFileHash(file)"
                      :icon="CopyDocument"
                      text
                      circle
                      size="small"
                      title="复制哈希值"
                    />
                    <el-button
                      v-if="file.status === 'pending' || file.status === 'error'"
                      @click="calculateSingleFile(file)"
                      :icon="Refresh"
                      text
                      circle
                      size="small"
                      title="重新计算"
                    />
                    <el-button
                      @click="removeFile(index)"
                      :icon="Delete"
                      text
                      circle
                      size="small"
                      class="remove-btn"
                      title="移除"
                    />
                  </div>
                </div>
              </div>
            </el-scrollbar>

            <div v-else class="empty-state">
              <el-icon class="empty-icon"><Document /></el-icon>
              <p class="empty-text">请选择文件或拖拽文件到此处</p>
              <p class="empty-hint">支持多文件选择，{{ autoCalculate ? '将自动计算哈希值' : '需手动点击批量计算' }}</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：结果统计 -->
      <el-col :span="10">
        <el-card shadow="never" class="box-card stats-card">
          <template #header>
            <div class="card-header">
              <span>统计信息</span>
            </div>
          </template>
          <div class="stats-content">
            <div class="stat-item">
              <span class="stat-label">总文件数</span>
              <span class="stat-value">{{ files.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">已计算</span>
              <span class="stat-value stat-success">{{ successCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">计算中</span>
              <span class="stat-value stat-processing">{{ calculatingCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">待计算</span>
              <span class="stat-value stat-pending">{{ pendingCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">失败</span>
              <span class="stat-value stat-error">{{ errorCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">当前算法</span>
              <span class="stat-value stat-algorithm">{{ algorithmLabel }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  FolderOpened,
  Delete,
  Document,
  Upload,
  CopyDocument,
  Check,
  Checked,
  DataLine,
  InfoFilled,
  Refresh
} from '@element-plus/icons-vue';
import { customMessage } from '@/utils/customMessage';
import { listen } from '@tauri-apps/api/event';

// 动态导入
const { execute } = await import('@/services/executor.ts');

interface FileItem {
  path: string;
  name: string;
  status: 'pending' | 'calculating' | 'success' | 'error';
  hash?: string;
  error?: string;
}

const files = ref<FileItem[]>([]);
const algorithm = ref('sha256');
const autoCalculate = ref(true);
const isCalculating = ref(false);
const isDragging = ref(false);

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

const getStatusText = (status: FileItem['status']) => {
  const statusMap = {
    pending: '待计算',
    calculating: '计算中',
    success: '成功',
    error: '失败',
  };
  return statusMap[status];
};

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
  file.status = 'calculating';
  file.hash = undefined;
  file.error = undefined;

  try {
    const result = await execute({
      service: 'file-hasher',
      method: 'calculateHash',
      params: {
        path: file.path,
        algorithm: algorithm.value
      }
    });
    
    if (result.success) {
      file.hash = result.data.hash;
      file.status = 'success';
    } else {
      file.error = result.error.message || '计算哈希失败';
      file.status = 'error';
    }
  } catch (err: any) {
    file.error = err.message || '计算哈希失败';
    file.status = 'error';
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
    isDragging.value = false;
    
    if (!paths || (Array.isArray(paths) && paths.length === 0)) {
      return;
    }
    
    const pathArray = Array.isArray(paths) ? paths : [paths];
    addFiles(pathArray);
  });
};

// 前端拖放事件处理 - 仅用于视觉反馈
const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy';
  }
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  // 检查是否真的离开了拖放区域
  const related = e.relatedTarget as HTMLElement;
  const currentTarget = e.currentTarget as HTMLElement;
  
  // 如果移动到子元素，不要移除高亮
  if (!currentTarget.contains(related)) {
    isDragging.value = false;
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // 清除高亮状态
  isDragging.value = false;
  // 实际的文件处理由 Tauri 后端的 custom-file-drop 事件处理
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

.box-card {
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  color: var(--text-color);
}

/* 头部区域 */
.header-section {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.algorithm-selector {
  display: flex;
  align-items: center;
  gap: 20px;
}

.selector-label {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-color);
}

/* 内容区域 */
.content-section {
  flex: 1;
  min-height: 0;
}

.content-section .el-col {
  height: 100%;
}

.file-list-card,
.stats-card {
  height: 100%;
  margin-bottom: 0;
}

.file-list-card :deep(.el-card__body) {
  height: calc(100% - 60px);
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.stats-card :deep(.el-card__body) {
  height: calc(100% - 60px);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: var(--text-color);
}

/* 拖拽区域 */
.drop-area {
  flex: 1;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  padding: 20px;
}

.drop-area.dragover {
  border-color: var(--primary-color);
  background-color: rgba(64, 158, 255, 0.05);
  box-shadow: 0 0 15px rgba(64, 158, 255, 0.3);
  transform: scale(1.01);
}

.drop-area.dragover::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 8px;
  background: linear-gradient(45deg, transparent, rgba(64, 158, 255, 0.2), transparent);
  animation: shimmer 2s infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 拖拽覆盖层 */
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(64, 158, 255, 0.1);
  border: 2px dashed var(--primary-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  color: var(--primary-color);
  pointer-events: none;
}

.drag-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.drag-overlay p {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

/* 空状态 */
/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-color-light);
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 14px;
  margin: 0;
  opacity: 0.7;
}

/* 文件列表 */
.file-list-scrollbar {
  flex: 1;
  height: 100%;
}

.file-list {
  padding: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  margin-bottom: 8px;
  background-color: var(--bg-color);
}

.file-item:hover {
  border-color: var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.file-item.is-calculating {
  background-color: rgba(64, 158, 255, 0.05);
  border-color: var(--primary-color);
}

.file-icon {
  margin-right: 12px;
  color: var(--text-color-light);
  font-size: 20px;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-path {
  font-size: 12px;
  color: var(--text-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: 500;
}

.status-pending {
  color: #909399;
  background-color: rgba(144, 147, 153, 0.1);
}

.status-calculating {
  color: #409eff;
  background-color: rgba(64, 158, 255, 0.1);
}

.status-success {
  color: #67c23a;
  background-color: rgba(103, 194, 58, 0.1);
}

.status-error {
  color: var(--error-color);
  background-color: rgba(245, 108, 108, 0.1);
}

.file-hash-preview {
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: var(--text-color-light);
  background-color: var(--input-bg);
  padding: 2px 6px;
  border-radius: 3px;
}

.file-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  flex-shrink: 0;
}

.remove-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-item:hover .remove-btn {
  opacity: 1;
}

/* 统计信息 */
.stats-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-color);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.stat-label {
  font-size: 14px;
  color: var(--text-color-light);
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-color);
}

.stat-success {
  color: #67c23a;
}

.stat-processing {
  color: #409eff;
}

.stat-pending {
  color: #909399;
}

.stat-error {
  color: var(--error-color);
}

.stat-algorithm {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}
/* 响应式布局 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .algorithm-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }
}
</style>
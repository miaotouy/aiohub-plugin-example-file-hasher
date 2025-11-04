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
          <el-button @click="selectFile" type="primary" :icon="FolderOpened">
            选择文件
          </el-button>
          <el-button @click="clearAll" :icon="Delete" plain>
            清空
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 主内容区域 -->
    <el-row :gutter="20" class="content-section">
      <!-- 左侧：文件输入区 -->
      <el-col :span="12">
        <el-card shadow="never" class="box-card input-card">
          <template #header>
            <div class="card-header">
              <span>文件选择</span>
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

            <div v-if="!filePath" class="empty-state">
              <el-icon class="empty-icon"><Document /></el-icon>
              <p class="empty-text">请选择文件或拖拽文件到此处</p>
              <p class="empty-hint">支持 SHA-256、SHA-512、MD5 算法</p>
            </div>

            <div v-else class="file-info">
              <div class="info-group">
                <label>文件路径</label>
                <el-input
                  v-model="filePath"
                  readonly
                  placeholder="文件路径将显示在这里"
                >
                  <template #append>
                    <el-button @click="selectFile" :icon="FolderOpened" />
                  </template>
                </el-input>
              </div>
              <div class="info-group">
                <label>当前算法</label>
                <div class="algorithm-display">
                  {{ algorithmLabel }}
                </div>
              </div>
              <el-button
                type="primary"
                @click="calculateHash"
                :loading="isCalculating"
                :disabled="!filePath.trim()"
                class="calculate-btn"
                size="large"
              >
                <el-icon v-if="!isCalculating"><Checked /></el-icon>
                {{ isCalculating ? '计算中...' : '计算哈希值' }}
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：结果显示区 -->
      <el-col :span="12">
        <el-card shadow="never" class="box-card result-card">
          <template #header>
            <div class="card-header">
              <span>计算结果</span>
              <el-button
                v-if="hashResult"
                @click="copyHash"
                size="small"
                :type="copySuccess ? 'success' : 'default'"
                :icon="copySuccess ? Check : CopyDocument"
              >
                {{ copySuccess ? '已复制' : '复制' }}
              </el-button>
            </div>
          </template>
          <div class="result-content">
            <!-- 错误提示 -->
            <el-alert
              v-if="error"
              type="error"
              :title="error"
              :closable="true"
              @close="error = ''"
              show-icon
            />

            <!-- 结果显示 -->
            <div v-else-if="hashResult" class="result-display">
              <div class="hash-value">
                {{ hashResult }}
              </div>
              <div class="result-info">
                <el-icon><InfoFilled /></el-icon>
                <span>使用 {{ algorithmLabel }} 算法计算</span>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
              <el-icon class="empty-icon"><DataLine /></el-icon>
              <p class="empty-text">计算结果将显示在这里</p>
              <p class="empty-hint">选择文件后自动计算哈希值</p>
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
  InfoFilled
} from '@element-plus/icons-vue';
import { customMessage } from '@/utils/customMessage';
import { listen } from '@tauri-apps/api/event';

// 动态导入
const { execute } = await import('@/services/executor.ts');

const filePath = ref('');
const algorithm = ref('sha256');
const hashResult = ref('');
const isCalculating = ref(false);
const error = ref('');
const copySuccess = ref(false);
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

// 选择文件
const selectFile = async () => {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: false,
      title: '选择要计算哈希的文件'
    });
    
    if (selected) {
      filePath.value = selected;
      // 自动计算
      await calculateHash();
    }
  } catch (err: any) {
    customMessage.error('选择文件失败');
  }
};

// 计算哈希
const calculateHash = async () => {
  if (!filePath.value.trim()) {
    error.value = '请输入文件路径';
    return;
  }

  error.value = '';
  hashResult.value = '';
  copySuccess.value = false;
  isCalculating.value = true;

  try {
    const result = await execute({
      service: 'file-hasher',
      method: 'calculateHash',
      params: {
        path: filePath.value,
        algorithm: algorithm.value
      }
    });
    
    if (result.success) {
      hashResult.value = result.data.hash;
      customMessage.success('哈希值计算成功');
    } else {
      error.value = result.error.message || '计算哈希失败';
    }
  } catch (err: any) {
    error.value = err.message || '计算哈希失败';
  } finally {
    isCalculating.value = false;
  }
};

// 复制哈希值
const copyHash = async () => {
  if (!hashResult.value) return;
  
  try {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(hashResult.value);
    copySuccess.value = true;
    customMessage.success('已复制到剪贴板');
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (err) {
    customMessage.error('复制失败');
  }
};

// 清空所有
const clearAll = () => {
  filePath.value = '';
  hashResult.value = '';
  error.value = '';
  copySuccess.value = false;
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
    
    if (pathArray.length > 1) {
      customMessage.warning('只能选择一个文件，已自动选择第一个');
    }
    
    filePath.value = pathArray[0];
    customMessage.success(`已选择文件: ${pathArray[0]}`);
    await calculateHash();
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

.input-card,
.result-card {
  height: 100%;
  margin-bottom: 0;
}

.input-card :deep(.el-card__body),
.result-card :deep(.el-card__body) {
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
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-color-light);
  text-align: center;
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

/* 文件信息 */
.file-info {
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 1;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.algorithm-display {
  padding: 12px 16px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  color: var(--text-color);
}

.calculate-btn {
  width: 100%;
  font-size: 16px;
  margin-top: auto;
}

/* 结果显示 */
.result-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.result-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.hash-value {
  padding: 20px;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
  line-height: 1.8;
  color: var(--text-color);
  flex: 1;
  overflow: auto;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-color-light);
  padding: 10px 14px;
  background-color: rgba(64, 158, 255, 0.05);
  border-radius: 4px;
  border: 1px solid rgba(64, 158, 255, 0.1);
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
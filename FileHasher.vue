<template>
  <div class="file-hasher-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button @click="selectFile" size="small" type="primary">
          <el-icon><FolderOpened /></el-icon>
          选择文件
        </el-button>
        <el-select v-model="algorithm" placeholder="选择算法" size="small" style="width: 140px">
          <el-option label="SHA-256" value="sha256" />
          <el-option label="SHA-512" value="sha512" />
          <el-option label="MD5" value="md5" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button @click="clearAll" size="small" plain>
          <el-icon><Delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-container">
      <!-- 左侧：输入区域 -->
      <div class="panel input-panel">
        <div class="panel-header">
          <span class="panel-title">文件选择</span>
        </div>
        <div 
          class="panel-content"
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
            <p class="empty-hint">支持的算法：SHA-256、SHA-512、MD5</p>
          </div>

          <div v-else class="file-info">
            <div class="info-row">
              <span class="info-label">文件路径：</span>
              <el-input
                v-model="filePath"
                readonly
                size="small"
              >
                <template #append>
                  <el-button @click="selectFile" :icon="FolderOpened" />
                </template>
              </el-input>
            </div>
            <div class="info-row">
              <span class="info-label">哈希算法：</span>
              <span class="info-value">{{ algorithmLabel }}</span>
            </div>
            <div class="action-row">
              <el-button
                type="primary"
                @click="calculateHash"
                :loading="isCalculating"
                :disabled="!filePath.trim()"
              >
                <el-icon v-if="!isCalculating"><Checked /></el-icon>
                {{ isCalculating ? '计算中...' : '计算哈希值' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：结果区域 -->
      <div class="panel result-panel">
        <div class="panel-header">
          <span class="panel-title">计算结果</span>
        </div>
        <div class="panel-content">
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
            <div class="result-header">
              <span class="result-label">哈希值</span>
              <el-button
                @click="copyHash"
                size="small"
                :type="copySuccess ? 'success' : 'default'"
                :icon="copySuccess ? Check : CopyDocument"
              >
                {{ copySuccess ? '已复制' : '复制' }}
              </el-button>
            </div>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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

// 拖拽处理
let dragCounter = 0;

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  dragCounter++;
  isDragging.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  dragCounter--;
  if (dragCounter === 0) {
    isDragging.value = false;
  }
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  dragCounter = 0;
  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    // 由于是桌面应用，我们需要从 DragEvent 获取文件路径
    // Tauri 的拖拽事件会包含文件路径
    if ((event.dataTransfer as any).paths && (event.dataTransfer as any).paths.length > 0) {
      filePath.value = (event.dataTransfer as any).paths[0];
      await calculateHash();
    } else {
      customMessage.error('无法获取文件路径，请使用选择文件按钮');
    }
  }
};
</script>

<style scoped>
.file-hasher-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg-color);
  box-sizing: border-box;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 主内容区域 */
.content-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 300px;
  overflow: hidden;
}

.input-panel {
  border-right: 1px solid var(--border-color);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: auto;
  position: relative;
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
  gap: 16px;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.info-value {
  font-size: 14px;
  color: var(--text-color-light);
  padding: 8px 12px;
  background-color: var(--bg-color);
  border-radius: 4px;
  font-family: monospace;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* 结果显示 */
.result-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.hash-value {
  padding: 16px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  word-break: break-all;
  line-height: 1.6;
  color: var(--text-color);
}

.result-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-color-light);
  padding: 8px 12px;
  background-color: rgba(64, 158, 255, 0.05);
  border-radius: 4px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .content-container {
    flex-direction: column;
  }

  .input-panel {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .panel {
    min-width: auto;
  }
}
</style>
<template>
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
          <FileItem
            v-for="(file, index) in files"
            :key="file.path"
            :file="file"
            @copy-hash="$emit('copy-hash', file)"
            @recalculate="$emit('recalculate', file)"
            @remove="$emit('remove', index)"
          />
        </div>
      </el-scrollbar>

      <div v-else class="empty-state">
        <el-icon class="empty-icon"><Document /></el-icon>
        <p class="empty-text">请选择文件或拖拽文件到此处</p>
        <p class="empty-hint">支持多文件选择，{{ autoCalculate ? '将自动计算哈希值' : '需手动点击批量计算' }}</p>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Document, Upload } from '@element-plus/icons-vue';
import FileItem, { type FileItem as FileItemType } from './FileItem.vue';

interface Props {
  files: FileItemType[];
  autoCalculate: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  'copy-hash': [file: FileItemType];
  'recalculate': [file: FileItemType];
  'remove': [index: number];
}>();

const isDragging = ref(false);

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

// 暴露方法给父组件
defineExpose({
  clearDragState: () => {
    isDragging.value = false;
  }
});
</script>

<style scoped>
.box-card {
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  color: var(--text-color);
}

.file-list-card {
  height: 100%;
  margin-bottom: 0;
}

.file-list-card :deep(.el-card__body) {
  height: calc(100% - 60px);
  padding: 10px;
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
</style>
<template>
  <div
    class="file-item"
    :class="{ 'is-calculating': file.status === 'calculating' }"
  >
    <el-icon class="file-icon">
      <Document />
    </el-icon>
    <div class="file-details">
      <div class="file-name" :title="file.name">{{ file.name }}</div>
      <div class="file-path" :title="file.path">{{ file.path }}</div>
      <div class="file-status-row">
        <span class="file-status" :class="`status-${file.status}`">
          {{ statusText }}
        </span>
      </div>
      <!-- 哈希值单独一行，更突出 -->
      <div v-if="file.hash" class="file-hash-container">
        <div class="file-hash-value" :title="file.hash">
          {{ file.hash }}
        </div>
      </div>
    </div>
    <div class="file-actions">
      <el-button
        v-if="file.status === 'success'"
        @click="$emit('copy-hash')"
        :icon="CopyDocument"
        text
        circle
        size="small"
        title="复制哈希值"
      />
      <el-button
        v-if="file.status === 'pending' || file.status === 'error'"
        @click="$emit('recalculate')"
        :icon="Refresh"
        text
        circle
        size="small"
        title="重新计算"
      />
      <el-button
        @click="$emit('remove')"
        :icon="Delete"
        text
        circle
        size="small"
        class="remove-btn"
        title="移除"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Document, CopyDocument, Refresh, Delete } from '@element-plus/icons-vue';

export interface FileItem {
  path: string;
  name: string;
  status: 'pending' | 'calculating' | 'success' | 'error';
  hash?: string;
  error?: string;
}

interface Props {
  file: FileItem;
}

const props = defineProps<Props>();

defineEmits<{
  'copy-hash': [];
  'recalculate': [];
  'remove': [];
}>();

const statusText = computed(() => {
  const statusMap = {
    pending: '待计算',
    calculating: '计算中',
    success: '成功',
    error: '失败',
  };
  return statusMap[props.file.status];
});
</script>

<style scoped>
.file-item {
  display: flex;
  align-items: flex-start;
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
  margin-top: 2px;
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
  margin-bottom: 6px;
}

.file-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
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

/* 哈希值容器 - 核心结果，应该最突出 */
.file-hash-container {
  margin-top: 4px;
  padding: 8px 10px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08) 0%, rgba(103, 194, 58, 0.08) 100%);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.file-hash-container:hover {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.12) 0%, rgba(103, 194, 58, 0.12) 100%);
  border-color: rgba(64, 158, 255, 0.4);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.file-hash-value {
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: var(--text-color);
  font-weight: 500;
  word-break: break-all;
  line-height: 1.6;
  letter-spacing: 0.5px;
  user-select: all;
  cursor: text;
}

.file-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  margin-top: 2px;
  flex-shrink: 0;
}

.remove-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-item:hover .remove-btn {
  opacity: 1;
}
</style>
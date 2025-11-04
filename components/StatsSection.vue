<template>
  <el-card shadow="never" class="box-card stats-card">
    <template #header>
      <div class="card-header">
        <span>统计信息</span>
      </div>
    </template>
    <div class="stats-content">
      <div class="stat-item">
        <span class="stat-label">总文件数</span>
        <span class="stat-value">{{ filesCount }}</span>
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
</template>

<script setup lang="ts">
interface Props {
  filesCount: number;
  successCount: number;
  calculatingCount: number;
  pendingCount: number;
  errorCount: number;
  algorithmLabel: string;
}

defineProps<Props>();
</script>

<style scoped>
.box-card {
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  color: var(--text-color);
}

.stats-card {
  height: 100%;
  margin-bottom: 0;
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
</style>
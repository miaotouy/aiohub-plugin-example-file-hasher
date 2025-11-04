<template>
  <el-card shadow="never" class="box-card header-section">
    <div class="header-content">
      <div class="algorithm-selector">
        <span class="selector-label">哈希算法</span>
        <el-radio-group v-model="localAlgorithm" size="large">
          <el-radio-button value="sha256">SHA-256</el-radio-button>
          <el-radio-button value="sha512">SHA-512</el-radio-button>
          <el-radio-button value="md5">MD5</el-radio-button>
        </el-radio-group>
      </div>
      <div class="header-actions">
        <el-checkbox v-model="localAutoCalculate" label="自动计算" />
        <el-button @click="$emit('select-files')" type="primary" :icon="FolderOpened">
          选择文件
        </el-button>
        <el-button
          @click="$emit('calculate-all')"
          type="success"
          :icon="Checked"
          :disabled="filesCount === 0"
          :loading="isCalculating"
        >
          批量计算
        </el-button>
        <el-button
          @click="$emit('copy-all')"
          :icon="CopyDocument"
          :disabled="successCount === 0"
          plain
        >
          复制全部
        </el-button>
        <el-button @click="$emit('clear-all')" :icon="Delete" plain>
          清空列表
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FolderOpened, Delete, CopyDocument, Checked } from '@element-plus/icons-vue';

interface Props {
  algorithm: string;
  autoCalculate: boolean;
  filesCount: number;
  successCount: number;
  isCalculating: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:algorithm': [value: string];
  'update:autoCalculate': [value: boolean];
  'select-files': [];
  'calculate-all': [];
  'copy-all': [];
  'clear-all': [];
}>();

const localAlgorithm = computed({
  get: () => props.algorithm,
  set: (value) => emit('update:algorithm', value)
});

const localAutoCalculate = computed({
  get: () => props.autoCalculate,
  set: (value) => emit('update:autoCalculate', value)
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
import { ref, h } from 'vue';
import { ElCard, ElButton, ElInput, ElSelect, ElOption, ElAlert, ElEmpty } from 'element-plus';
import { CopyDocument, FolderOpened, Check } from '@element-plus/icons-vue';

export default {
  name: 'FileHasher',
  async setup() {
    // 动态导入 executor
    const { execute } = await import('/src/services/executor.ts');
    
    const filePath = ref('');
    const algorithm = ref('sha256');
    const hashResult = ref('');
    const isCalculating = ref(false);
    const error = ref('');
    const copySuccess = ref(false);

    // 调用插件服务计算哈希
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
        } else {
          error.value = result.error.message || '计算哈希失败';
        }
      } catch (err) {
        error.value = err.message || '计算哈希失败';
      } finally {
        isCalculating.value = false;
      }
    };

    const selectFile = async () => {
      try {
        // 使用 Tauri 的文件选择对话框
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          multiple: false,
          title: '选择要计算哈希的文件'
        });
        
        if (selected) {
          filePath.value = selected;
        }
      } catch (err) {
        error.value = '选择文件失败';
      }
    };

    const copyHash = async () => {
      if (!hashResult.value) return;
      
      try {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(hashResult.value);
        copySuccess.value = true;
        setTimeout(() => {
          copySuccess.value = false;
        }, 2000);
      } catch (err) {
        error.value = '复制失败';
      }
    };

    const clearAll = () => {
      filePath.value = '';
      hashResult.value = '';
      error.value = '';
      copySuccess.value = false;
    };

    return () => h('div', { 
      class: 'file-hasher-container',
      style: {
        height: '100%',
        width: '100%',
        padding: '20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }
    }, [
      // 标题卡片
      h(ElCard, { shadow: 'never' }, () => [
        h('div', { 
          style: { 
            fontSize: '20px', 
            fontWeight: 'bold',
            marginBottom: '8px'
          } 
        }, '🔐 文件哈希计算器'),
        h('div', { 
          style: { 
            fontSize: '14px', 
            color: 'var(--text-color-light)' 
          } 
        }, '计算文件的 SHA-256 哈希值')
      ]),

      // 输入区域
      h(ElCard, { shadow: 'never' }, () => [
        h('div', { style: { marginBottom: '16px' } }, [
          h('div', { 
            style: { 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '8px'
            } 
          }, '文件路径'),
          h('div', { 
            style: { 
              display: 'flex', 
              gap: '8px' 
            } 
          }, [
            h(ElInput, {
              modelValue: filePath.value,
              'onUpdate:modelValue': (val) => { filePath.value = val; },
              placeholder: '请输入文件路径或点击选择文件...',
              clearable: true
            }),
            h(ElButton, {
              onClick: selectFile,
              icon: h(FolderOpened)
            }, () => '选择文件')
          ])
        ]),

        h('div', { style: { marginBottom: '16px' } }, [
          h('div', { 
            style: { 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '8px'
            } 
          }, '哈希算法'),
          h(ElSelect, {
            modelValue: algorithm.value,
            'onUpdate:modelValue': (val) => { algorithm.value = val; },
            style: { width: '200px' }
          }, () => [
            h(ElOption, { label: 'SHA-256', value: 'sha256' }),
            h(ElOption, { label: 'SHA-512', value: 'sha512' }),
            h(ElOption, { label: 'MD5', value: 'md5' })
          ])
        ]),

        h('div', { 
          style: { 
            display: 'flex', 
            gap: '8px',
            marginTop: '16px'
          } 
        }, [
          h(ElButton, {
            type: 'primary',
            onClick: calculateHash,
            loading: isCalculating.value,
            disabled: !filePath.value.trim()
          }, () => isCalculating.value ? '计算中...' : '计算哈希'),
          h(ElButton, {
            onClick: clearAll
          }, () => '清空')
        ])
      ]),

      // 错误提示
      error.value ? h(ElAlert, {
        type: 'error',
        title: error.value,
        closable: true,
        onClose: () => { error.value = ''; }
      }) : null,

      // 结果区域
      hashResult.value ? h(ElCard, { shadow: 'never' }, () => [
        h('div', { 
          style: { 
            fontSize: '14px', 
            fontWeight: '500',
            marginBottom: '12px'
          } 
        }, '哈希结果'),
        h('div', {
          style: {
            backgroundColor: 'var(--bg-color)',
            padding: '12px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '13px',
            wordBreak: 'break-all',
            marginBottom: '12px'
          }
        }, hashResult.value),
        h('div', { 
          style: { 
            display: 'flex', 
            gap: '8px' 
          } 
        }, [
          h(ElButton, {
            onClick: copyHash,
            icon: copySuccess.value ? h(Check) : h(CopyDocument),
            type: copySuccess.value ? 'success' : 'default'
          }, () => copySuccess.value ? '已复制' : '复制哈希')
        ])
      ]) : !isCalculating.value ? h(ElEmpty, {
        description: '请选择文件并点击计算哈希'
      }) : null
    ]);
  }
};
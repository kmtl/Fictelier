import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // ワーニングのしきい値を 1000kB に引き上げる（実用的な判断）
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 大きなライブラリを別ファイルに分割して、1ファイルあたりのサイズを抑える設定
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Firebase関連をひとまとめにする
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            // それ以外のライブラリ（lucide-react等）
            return 'vendor-libs';
          }
        },
      },
    },
  },
});
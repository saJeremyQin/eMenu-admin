        import { defineConfig } from 'vite'
        import react from '@vitejs/plugin-react' // 注意：这里是 @vitejs/plugin-react

        export default defineConfig({
          plugins: [
            react(), // 使用 React 插件
          ],
        })
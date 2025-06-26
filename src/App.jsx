// src/App.jsx
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // 也可以在这里导入样式，但通常在 main.jsx 导入一次即可

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main style={{
          fontFamily: 'Inter, Arial, sans-serif',
          textAlign: 'center',
          color: '#2c3e50',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f0f2f5',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            backgroundColor: 'white'
          }}>
            <h1>欢迎，{user.username}!</h1>
            <p>您已成功登录到 emenu-admin 测试环境。</p>
            <button
              onClick={signOut}
              style={{
                backgroundColor: '#ef4444', // Tailwind red-500
                color: 'white',
                fontWeight: 'bold',
                padding: '8px 16px',
                borderRadius: '6px', // Tailwind rounded-md
                boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                transition: 'background-color 0.3s ease-in-out',
                border: 'none',
                cursor: 'pointer',
                marginTop: '20px'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')} // Tailwind red-700
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
            >
              退出登录
            </button>
            <hr style={{ margin: '24px 0', borderColor: '#d1d5db' }} />
            <p style={{ fontSize: '1.125rem', color: '#4b5563' }}>
              恭喜！登录界面已成功显示。
              这里是您未来要放置菜单管理组件的地方，用于与您的 AppSync 后端交互。
            </p>
            {/* <MenuItemManager user={user} /> 待添加的菜单管理组件 */}
          </div>
        </main>
      )}
    </Authenticator>
  );
}

export default App;

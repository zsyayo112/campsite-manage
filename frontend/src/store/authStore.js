import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      rememberMe: false,

      /**
       * 设置认证信息
       * @param {string} token - JWT token
       * @param {object} user - 用户信息
       * @param {boolean} remember - 是否记住登录状态
       */
      setAuth: (token, user, remember = false) => {
        set({
          token,
          user,
          isAuthenticated: true,
          rememberMe: remember,
        });
      },

      /**
       * 更新用户信息
       * @param {object} userData - 用户数据
       */
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      /**
       * 登出
       */
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          rememberMe: false,
        });
      },

      /**
       * 获取 token
       */
      getToken: () => get().token,

      /**
       * 检查是否已认证
       */
      checkAuth: () => {
        const { token, isAuthenticated } = get();
        return !!(token && isAuthenticated);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        rememberMe: state.rememberMe,
      }),
    }
  )
);

export default useAuthStore;

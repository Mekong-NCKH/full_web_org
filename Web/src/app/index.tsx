import { GoogleOAuthProvider } from '@react-oauth/google';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { ToastContainer } from 'react-toastify';

import { GOOGLE_OAUTH_CLIENT_ID } from '@/config/env';
import { useAuthStore } from '@/stores';

import { routeTree } from '../routeTree.gen';

const router = createRouter({
  routeTree,
  context: {
    authContext: { isAuthenticated: false },
  },
});

declare module '@tanstack/react-router' { 
  interface Register {
    router: typeof router;
  }
}

const AppRouter = () => {
  const { isAuthenticated } = useAuthStore();
  // const { user } = useUserStore();
  return (
    <RouterProvider
      router={router}
      context={{
        authContext: { isAuthenticated },
      }}
    />
  );
};

const App = () => {
  return (
    // this gg client id is temporary data
    <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CLIENT_ID}>
      <AppRouter />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </GoogleOAuthProvider>
  );
};

export default App;

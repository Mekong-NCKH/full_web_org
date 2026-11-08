import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { useAuthStore } from '@/stores';

export const Route = createFileRoute('/_private')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({
        to: '/home',
      });
    }
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  return <Outlet />;
}

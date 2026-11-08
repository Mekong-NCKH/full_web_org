import {
  createRootRouteWithContext,
  Outlet,
  useRouter,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Suspense, useEffect } from 'react';

import { useAuthStore } from '@/stores';

type RouterContext = {
  authContext: { isAuthenticated: boolean };
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    router.invalidate();
  }, [isAuthenticated, router]);

  return (
    <>
      <Outlet />
      <TanStackRouterDevtools />
      <Suspense></Suspense>
    </>
  );
}

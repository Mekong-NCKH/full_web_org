import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import LoggedInLayout from '@/components/logged-in-layout';

type RouterContext = {
  authContext: { isAuthenticated: boolean };
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <LoggedInLayout>
      <Outlet />
    </LoggedInLayout>
  ),
});

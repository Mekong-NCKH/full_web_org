import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

type RouterContext = {
  authContext: { isAuthenticated: boolean };
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
    </>
  ),
});

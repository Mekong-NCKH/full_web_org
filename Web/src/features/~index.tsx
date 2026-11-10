import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/home' });
  },
  component: LandingPage,
});

function LandingPage() {
  return <div className="p-2"></div>;
}

import { createFileRoute } from '@tanstack/react-router'

import LoggedInLayout from '@/components/logged-in-layout'

export const Route = createFileRoute('/_private/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <LoggedInLayout>
      <div>Dashboard</div>
    </LoggedInLayout>
  )
}

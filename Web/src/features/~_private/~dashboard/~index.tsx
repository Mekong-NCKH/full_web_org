import LoggedInLayout from '@/components/logged-in-layout'
import { createFileRoute } from '@tanstack/react-router'

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

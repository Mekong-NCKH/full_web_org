import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

export default function ScrollToTop(): null {
  const router = useRouterState()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }, [router.location.pathname])

  return null
}

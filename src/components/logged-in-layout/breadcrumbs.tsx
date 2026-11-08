import { Link, useMatches } from '@tanstack/react-router'
import React from 'react'

function Breadcrumbs({ separator = '>>' }) {
  const matches = useMatches()

  
  const crumbs = matches
    .filter((match) => match.routeId !== '__root__')
    .map((match) => {
      return {
        label:
          (match.staticData as any)?.breadcrumb ||
          decodeURIComponent(match.pathname.split('/').pop() || '')
            .replace(/[-_]/g, ' ')
            .replace(/^\w/, (c) => c.toUpperCase()), 
        path: match.pathname,
      }
    })

  return (
    <nav className="m-4 text-sm text-gray-700" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        <li>
          <Link to="/" className="text-gray-500 transition-colors hover:text-blue-600 hover:underline">
            Trang chủ
          </Link>
        </li>

        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1

          return (
            <li key={crumb.path} className="flex items-center">
              <span className="mx-2 select-none text-xs text-gray-400">{separator}</span>
              
              {isLast ? (
                <span className="font-semibold text-gray-800">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-gray-500 transition-colors hover:text-blue-600 hover:underline"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"

export function SignOutButton() {
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" })
  }

  if (!session) return null

  return (
    <div className="dropdown">
      <button
        className="btn btn-secondary dropdown-toggle"
        type="button"
        id="userDropdown"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <i className="ti ti-user me-2"></i>
        {session.user?.name || session.user?.email}
      </button>
      <ul className="dropdown-menu" aria-labelledby="userDropdown">
        <li>
          <Link className="dropdown-item" href="/profile">
            <i className="ti ti-user me-2"></i>
            Profile
          </Link>
        </li>
        <li>
          <Link className="dropdown-item" href="/settings">
            <i className="ti ti-settings me-2"></i>
            Settings
          </Link>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <button className="dropdown-item" onClick={handleSignOut}>
            <i className="ti ti-logout me-2"></i>
            Sign Out
          </button>
        </li>
      </ul>
    </div>
  )
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  console.log("Simple middleware - Path:", request.nextUrl.pathname)
  
  // List of public routes
  const publicRoutes = [
    "/auth",
    "/api/auth",
    "/api/health",
    "/api/test",
    "/api/swagger",
    "/_next",
    "/favicon.ico",
    "/images",
    "/fonts",
    "/css",
    "/js"
  ]

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  console.log("Simple middleware - Is public route:", isPublicRoute)

  // If it's not a public route, redirect to signin
  if (!isPublicRoute) {
    console.log("Simple middleware - Redirecting to signin")
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  console.log("Simple middleware - Allowing access")
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ]
}

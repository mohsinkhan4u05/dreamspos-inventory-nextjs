import { withAuth } from "next-auth/middleware"

export default withAuth(
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Public routes that don't require authentication
        const publicRoutes = [
          "/auth/signin",
          "/auth/signin-2", 
          "/auth/signin-3",
          "/auth/register",
          "/auth/register-2",
          "/auth/register-3",
          "/auth/forgot-password",
          "/auth/forgot-password-2",
          "/auth/forgot-password-3",
          "/auth/reset-password",
          "/auth/reset-password-2",
          "/auth/reset-password-3",
          "/auth/email-verification",
          "/auth/email-verification-2",
          "/auth/email-verification-3",
          "/auth/two-step-verification",
          "/auth/two-step-verification-2",
          "/auth/two-step-verification-3",
          "/auth/lock-screen",
          "/auth/coming-soon",
          "/auth/under-maintenance",
          "/auth/error-404",
          "/auth/error-500",
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
          pathname.startsWith(route) || pathname === route
        )
        
        // Allow access to public routes without authentication
        if (isPublicRoute) {
          return true
        }
        
        // Require authentication for all other routes
        return !!token
      },
    },
    pages: {
      signIn: "/auth/signin"
    }
  }
)

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

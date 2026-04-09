import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
    const host = request.headers.get('host') || ''
    const subdomain = host.split('.')[0]
    const pathname = request.nextUrl.pathname
    const token = request.cookies.get('session_token')?.value

    // Internal Admin subdomain: internal.risentta.com
    if (subdomain === 'internal') {
        // Allow static files and internal paths to pass through
        if (pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.startsWith('/internal/')) {
            return NextResponse.next()
        }

        // Allow API routes to pass through for login
        if (pathname.startsWith('/api/')) {
            return NextResponse.next()
        }

        // If not logged in, redirect to /internal/login
        if (!token) {
            return NextResponse.redirect(new URL('/internal/login', request.url))
        }

        // Root path should redirect to /adm dashboard
        if (pathname === '/') {
            return NextResponse.redirect(new URL('/adm', request.url))
        }

        // Rewrite internal subdomain to /adm paths for admin routes
        if (pathname.startsWith('/adm')) {
            return NextResponse.rewrite(new URL(pathname, request.url))
        }

        return NextResponse.next()
    }

    // SaaS subdomain: write.risentta.com
    if (subdomain === 'write') {
        const customerToken = request.cookies.get('customer_session')?.value
        
        // Allow static files to pass through
        if (pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
            return NextResponse.next()
        }
        
        // Allow customer auth API routes
        if (pathname.startsWith('/api/customer/')) {
            return NextResponse.next()
        }
        
        // Allow internal admin auth API for admin access to write subdomain
        if (pathname.startsWith('/api/auth/')) {
            return NextResponse.next()
        }
        
        // Rewrite clean paths to /write/* paths for write subdomain
        // Example: /login -> /write/login, /register -> /write/register
        const publicPaths = ['/login', '/register', '/forgot-password']
        const protectedPaths = ['/dashboard', '/projects', '/templates', '/settings', '/support']
        
        // Check if requesting a clean public path (e.g., /login)
        if (publicPaths.includes(pathname)) {
            return NextResponse.rewrite(new URL(`/write${pathname}`, request.url))
        }
        
        // Check if requesting a clean protected path (e.g., /dashboard)
        if (protectedPaths.some(path => pathname.startsWith(path))) {
            // If not logged in, redirect to login
            if (!customerToken && !token) {
                return NextResponse.redirect(new URL('/login', request.url))
            }
            return NextResponse.rewrite(new URL(`/write${pathname}`, request.url))
        }
        
        // Allow root path
        if (pathname === '/') {
            return NextResponse.next()
        }
        
        // If not logged in and trying to access any other path, redirect to login
        if (!customerToken && !token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        
        // For authenticated users, rewrite any /write/* path
        if (pathname.startsWith('/write/')) {
            return NextResponse.next()
        }
        
        // Rewrite any other path to /write/* for authenticated users
        return NextResponse.rewrite(new URL(`/write${pathname}`, request.url))
    }

    // Admin subdomain: adm.risentta.com
    if (subdomain === 'adm') {
        if (!token) {
            return NextResponse.redirect(new URL('https://risentta.com/login'))
        }
        return NextResponse.rewrite(new URL(`/adm${pathname === '/' ? '' : pathname}`, request.url))
    }

    // Main domain: risentta.com (landing page)
    // Block /internal/* and /adm/* paths on main domain - these are for internal subdomain only
    if (pathname.startsWith('/internal/') || pathname.startsWith('/adm')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
};
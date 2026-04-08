import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
    const host = request.headers.get('host') || ''
    const subdomain = host.split('.')[0]
    const pathname = request.nextUrl.pathname
    const token = request.cookies.get('session_token')?.value

    // Internal Admin subdomain: internal.risentta.com
    if (subdomain === 'internal') {
        // Allow access to /internal/login page when not logged in
        if (pathname === '/internal/login') {
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
        // Rewrite to /write path for SaaS app
        if (pathname === '/' || pathname.startsWith('/write')) {
            // Auth check for write subdomain (redirect to main if not logged in)
            if (!token && pathname !== '/') {
                return NextResponse.redirect(new URL('https://risentta.com/login'))
            }
            return NextResponse.rewrite(new URL(`/write${pathname === '/' ? '' : pathname}`, request.url))
        }
    }

    // Admin subdomain: adm.risentta.com
    if (subdomain === 'adm') {
        if (!token) {
            return NextResponse.redirect(new URL('https://risentta.com/login'))
        }
        return NextResponse.rewrite(new URL(`/adm${pathname === '/' ? '' : pathname}`, request.url))
    }

    // Main domain: risentta.com (landing page)
    // Protect /adm paths on main domain too
    const isPathAdmin = pathname.startsWith('/adm')
    if (isPathAdmin && !token) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
  matcher: ['/:path*'],
};
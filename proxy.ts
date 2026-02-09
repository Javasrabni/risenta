import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
    const token = request.cookies.get('session_token')?.value
    const isPathAdmin = request.nextUrl.pathname.startsWith('/adm')

    if(isPathAdmin && !token) {
        return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
}

export const config = {
  matcher: ['/adm/:path*'],
};
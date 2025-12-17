import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import { getCustomerSessionFromRequest } from "@/lib/customerAuth";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/app")) {
    const session = await getSessionFromRequest(request);

    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/portal")) {
    const customerSession = await getCustomerSessionFromRequest(request);

    if (!customerSession) {
      return NextResponse.redirect(new URL("/customer/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

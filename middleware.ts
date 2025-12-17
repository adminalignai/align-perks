import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getCustomerSessionFromRequest } from "./lib/customerAuth";

export async function middleware(request: NextRequest) {
  const session = await getCustomerSessionFromRequest(request);

  if (!session) {
    const loginUrl = new URL("/customer/login", request.url);
    if (request.nextUrl.pathname !== "/customer/login") {
      const destination = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      loginUrl.searchParams.set("redirect", destination);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"],
};

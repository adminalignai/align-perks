"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const PUBLIC_PATH_PREFIXES = ["/login", "/register", "/invite", "/customer/login", "/customer/register", "/customer/invite"];

export default function ChatWidgetLoader() {
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPath) {
    return null;
  }

  return (
    <Script
      src="https://widgets.leadconnectorhq.com/loader.js"
      data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
      data-widget-id="6683b644dd585615f2bbf358"
      strategy="lazyOnload"
    />
  );
}

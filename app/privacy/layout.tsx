import { getPageMetadata } from "@/lib/routes";
import type { Metadata } from "next";

export const metadata: Metadata = getPageMetadata("/privacy");

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

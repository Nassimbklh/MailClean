import { getPageMetadata } from "@/lib/routes";
import type { Metadata } from "next";

export const metadata: Metadata = getPageMetadata("/account/billing");

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

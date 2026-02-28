import { getPageMetadata } from "@/lib/routes";
import type { Metadata } from "next";

export const metadata: Metadata = getPageMetadata("/pricing");

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import { getPageMetadata } from "@/lib/routes";
import type { Metadata } from "next";

export const metadata: Metadata = getPageMetadata("/dashboard");

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

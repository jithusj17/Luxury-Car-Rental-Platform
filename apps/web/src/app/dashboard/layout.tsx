import { DashboardShell } from "@/shell/dashboard-shell";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <DashboardShell>{children}</DashboardShell>;
}

import { SiteFooter } from "@/shell/site-footer";
import { SiteHeader } from "@/shell/site-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

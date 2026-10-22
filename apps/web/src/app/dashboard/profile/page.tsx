import { ProfileView } from "@/domains/auth/components/profile-view";
import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Edit profile" />
      <ProfileView />
    </>
  );
}

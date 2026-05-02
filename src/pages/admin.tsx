import Head from "next/head";
import type { GetServerSideProps } from "next";

import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminLoginPanel } from "@/components/AdminLoginPanel";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchAdminOverview } from "@/lib/admin-dashboard";
import type { AdminDashboardResponse } from "@/lib/types";

type AdminPageProps = {
  authorized: boolean;
  initialData: AdminDashboardResponse | null;
};

export const getServerSideProps: GetServerSideProps<AdminPageProps> = async (
  context,
) => {
  if (!isAdminAuthorized(context.req)) {
    return {
      props: {
        authorized: false,
        initialData: null,
      },
    };
  }

  const initialData = await fetchAdminOverview();

  return {
    props: {
      authorized: true,
      initialData,
    },
  };
};

export default function AdminPage({
  authorized,
  initialData,
}: AdminPageProps) {
  return (
    <>
      <Head>
        <title>Admin Dashboard | Experiment Study</title>
        <meta
          name="description"
          content="Admin dashboard for monitoring participant progress and responses."
        />
      </Head>
      {authorized && initialData ? (
        <AdminDashboard
          initialData={initialData}
          onLogout={() => window.location.reload()}
        />
      ) : (
        <AdminLoginPanel onSuccess={() => window.location.reload()} />
      )}
    </>
  );
}

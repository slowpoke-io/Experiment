import Head from "next/head";
import type { GetServerSideProps } from "next";

import { AdminLoginPanel } from "@/components/AdminLoginPanel";
import { AdminStatsDashboard } from "@/components/AdminStatsDashboard";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchAdminStatistics } from "@/lib/admin-statistics";
import type { AdminStatisticsResponse } from "@/lib/types";

type AdminStatsPageProps = {
  authorized: boolean;
  initialData: AdminStatisticsResponse | null;
};

export const getServerSideProps: GetServerSideProps<AdminStatsPageProps> = async (
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

  const initialData = await fetchAdminStatistics();

  return {
    props: {
      authorized: true,
      initialData,
    },
  };
};

export default function AdminStatsPage({
  authorized,
  initialData,
}: AdminStatsPageProps) {
  return (
    <>
      <Head>
        <title>Admin Statistics | Experiment Study</title>
        <meta
          name="description"
          content="Admin statistics view for participant responses and construct comparisons."
        />
      </Head>
      {authorized && initialData ? (
        <AdminStatsDashboard
          initialData={initialData}
          onLogout={() => window.location.reload()}
        />
      ) : (
        <AdminLoginPanel onSuccess={() => window.location.reload()} />
      )}
    </>
  );
}

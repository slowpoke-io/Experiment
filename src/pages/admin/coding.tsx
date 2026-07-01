import Head from "next/head";
import type { GetServerSideProps } from "next";

import { AdminCodingPage } from "@/components/AdminCodingPage";
import { AdminLoginPanel } from "@/components/AdminLoginPanel";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchCodingData } from "@/lib/admin-coding";
import type { AdminCodingDataResponse } from "@/lib/admin-coding";

type AdminCodingRouteProps = {
  authorized: boolean;
  initialData: AdminCodingDataResponse | null;
};

export const getServerSideProps: GetServerSideProps<AdminCodingRouteProps> = async (context) => {
  if (!isAdminAuthorized(context.req)) {
    return { props: { authorized: false, initialData: null } };
  }

  const initialData = await fetchCodingData();

  return { props: { authorized: true, initialData } };
};

export default function AdminCodingRoute({ authorized, initialData }: AdminCodingRouteProps) {
  return (
    <>
      <Head>
        <title>Feedback Coding | Experiment Study</title>
        <meta name="description" content="Admin page for coding participant feedback content." />
      </Head>
      {authorized && initialData ? (
        <AdminCodingPage
          initialData={initialData}
          onLogout={() => window.location.reload()}
        />
      ) : (
        <AdminLoginPanel onSuccess={() => window.location.reload()} />
      )}
    </>
  );
}

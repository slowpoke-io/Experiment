import Head from "next/head";
import type { GetServerSideProps } from "next";

import { AdminFeedbackPage } from "@/components/AdminFeedbackPage";
import { AdminLoginPanel } from "@/components/AdminLoginPanel";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchAdminFeedback } from "@/lib/admin-feedback";
import type { AdminFeedbackResponse } from "@/lib/types";

type AdminFeedbackRouteProps = {
  authorized: boolean;
  initialData: AdminFeedbackResponse | null;
};

export const getServerSideProps: GetServerSideProps<
  AdminFeedbackRouteProps
> = async (context) => {
  if (!isAdminAuthorized(context.req)) {
    return {
      props: {
        authorized: false,
        initialData: null,
      },
    };
  }

  const initialData = await fetchAdminFeedback();

  return {
    props: {
      authorized: true,
      initialData,
    },
  };
};

export default function AdminFeedbackRoute({
  authorized,
  initialData,
}: AdminFeedbackRouteProps) {
  return (
    <>
      <Head>
        <title>Feedback Review | Experiment Study</title>
        <meta
          name="description"
          content="Admin page for reviewing submitted AI feedback and feedback reasons."
        />
      </Head>
      {authorized && initialData ? (
        <AdminFeedbackPage
          initialData={initialData}
          onLogout={() => window.location.reload()}
        />
      ) : (
        <AdminLoginPanel onSuccess={() => window.location.reload()} />
      )}
    </>
  );
}

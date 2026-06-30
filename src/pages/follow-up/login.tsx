import Head from "next/head";
import type { GetServerSideProps } from "next";

import { FollowUpLoginPanel } from "@/components/FollowUpLoginPanel";
import { isFollowUpAuthorized } from "@/lib/follow-up-auth";

export const getServerSideProps: GetServerSideProps = async (context) => {
  if (isFollowUpAuthorized(context.req)) {
    return {
      redirect: {
        destination: "/follow-up/settings",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default function FollowUpLoginPage() {
  return (
    <>
      <Head>
        <title>Login | Experiment Study</title>
        <meta
          name="description"
          content="Sign in to access follow-up settings."
        />
      </Head>
      <FollowUpLoginPanel
        onSuccess={() => window.location.assign("/follow-up/settings")}
      />
    </>
  );
}

import type { GetServerSideProps } from "next";

import { isFollowUpAuthorized } from "@/lib/follow-up-auth";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    redirect: {
      destination: isFollowUpAuthorized(context.req)
        ? "/follow-up/settings"
        : "/follow-up/login",
      permanent: false,
    },
  };
};

export default function FollowUpIndexPage() {
  return null;
}

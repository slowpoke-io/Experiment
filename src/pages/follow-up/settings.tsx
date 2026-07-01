import Head from "next/head";
import type { GetServerSideProps } from "next";

import { FollowUpSettingsPage } from "@/components/FollowUpSettingsPage";
import { isFollowUpAuthorized } from "@/lib/follow-up-auth";
import { getProlificSettings } from "@/lib/prolific-settings";

type FollowUpSettingsProps = {
  initialSettings: {
    pipelineCode: string;
    completeCode: string;
    failCode: string;
    noconsentCode: string;
    studyOpen: boolean;
    completeUrl: string;
    failUrl: string;
    noconsentUrl: string;
  };
};

export const getServerSideProps: GetServerSideProps<
  FollowUpSettingsProps
> = async (context) => {
  if (!isFollowUpAuthorized(context.req)) {
    return {
      redirect: {
        destination: "/follow-up/login",
        permanent: false,
      },
    };
  }

  const settings = await getProlificSettings();

  return {
    props: {
      initialSettings: {
        pipelineCode: settings.pipelineCode,
        completeCode: settings.completeCode,
        failCode: settings.failCode,
        noconsentCode: settings.noconsentCode,
        studyOpen: settings.studyOpen,
        completeUrl: settings.completeUrl,
        failUrl: settings.failUrl,
        noconsentUrl: settings.noconsentUrl,
      },
    },
  };
};

export default function FollowUpSettingsRoute({
  initialSettings,
}: FollowUpSettingsProps) {
  return (
    <>
      <Head>
        <title>Settings | Experiment Study</title>
        <meta
          name="description"
          content="Manage follow-up settings."
        />
      </Head>
      <FollowUpSettingsPage initialSettings={initialSettings} />
    </>
  );
}

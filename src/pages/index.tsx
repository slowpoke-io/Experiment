import Head from "next/head";
import type { GetServerSideProps } from "next";

import { AccessDeniedPanel } from "@/components/AccessDeniedPanel";
import {
  buildConsentPath,
  extractParticipantQuery,
} from "@/lib/participant-routing";

type HomeProps = {
  prolificId?: string | null;
  sharedQuery?: Record<string, string>;
};

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({
  query,
}) => {
  const { prolificId, sharedQuery } = extractParticipantQuery(query);

  if (prolificId) {
    return {
      redirect: {
        destination: buildConsentPath(prolificId, sharedQuery),
        permanent: false,
      },
    };
  }

  return {
    props: {
      prolificId,
      sharedQuery,
    },
  };
};

export default function Home() {
  return (
    <>
      <Head>
        <title>Study unavailable | Experiment Study</title>
        <meta
          name="description"
          content="The study requires a valid Prolific participant identifier."
        />
      </Head>
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <AccessDeniedPanel />
      </div>
    </>
  );
}

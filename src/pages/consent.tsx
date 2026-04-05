import Head from "next/head";
import type { GetServerSideProps } from "next";

import { ConsentPanel } from "@/components/ConsentPanel";
import { extractParticipantQuery } from "@/lib/participant-routing";

type ConsentPageProps = {
  prolificId: string | null;
  sharedQuery: Record<string, string>;
};

export const getServerSideProps: GetServerSideProps<ConsentPageProps> = async ({
  query,
}) => {
  const { prolificId, sharedQuery } = extractParticipantQuery(query);

  return {
    props: {
      prolificId,
      sharedQuery,
    },
  };
};

export default function ConsentPage({
  prolificId,
  sharedQuery,
}: ConsentPageProps) {
  return (
    <>
      <Head>
        <title>Informed Consent | Experiment Study</title>
        <meta
          name="description"
          content="Informed consent entry page for the experiment study."
        />
      </Head>
      <ConsentPanel prolificId={prolificId} sharedQuery={sharedQuery} />
    </>
  );
}

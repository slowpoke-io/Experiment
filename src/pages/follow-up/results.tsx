import Head from "next/head";
import type { GetServerSideProps } from "next";

import { FollowUpResultsPage } from "@/components/FollowUpResultsPage";
import { isFollowUpAuthorized } from "@/lib/follow-up-auth";
import { fetchFollowUpResults } from "@/lib/follow-up-results";
import { getProlificSettings } from "@/lib/prolific-settings";
import type { AdminDashboardSummary, AdminStatus } from "@/lib/types";

type FollowUpResultsProps = {
  initialData: {
    activePipelineCode: string;
    availablePipelineCodes: string[];
    selectedPipelineCodes: string[];
    summary: AdminDashboardSummary;
    rows: Array<{
      pipelineCode: string;
      prolificId: string;
      status: AdminStatus;
      iv1: string;
      iv2: string;
      lastSubmissionAt: string | null;
      totalSeconds: number | null;
      failureReasonText: string;
      hasFeedback: boolean;
      feedbackContent: string;
      feedbackReason: string;
      answerGroups: Array<{
        stageId: string;
        entries: Array<{
          label: string;
          value: string;
        }>;
      }>;
    }>;
  };
};

export const getServerSideProps: GetServerSideProps<
  FollowUpResultsProps
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
  const requestedPipelineCodes = Array.isArray(context.query.pipeline)
    ? context.query.pipeline
    : typeof context.query.pipeline === "string"
      ? [context.query.pipeline]
      : [];
  const results = await fetchFollowUpResults(
    settings.pipelineCode,
    requestedPipelineCodes,
  );

  return {
    props: {
      initialData: results,
    },
  };
};

export default function FollowUpResultsRoute({
  initialData,
}: FollowUpResultsProps) {
  return (
    <>
      <Head>
        <title>Results | Experiment Study</title>
        <meta
          name="description"
          content="View and download follow-up results."
        />
      </Head>
      <FollowUpResultsPage initialData={initialData} />
    </>
  );
}

import {
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { useEffect, useState } from "react";
import { DEFAULT_STUDIO_CLIENT_OPTIONS, useClient } from "sanity";

import { ViewLayout } from "./ViewLayout";

interface Stats {
  avgAgentConfusion: number | null;
  avgSuccess: number | null;
  avgUserConfusion: number | null;
  contentGapRate: number | null;
  total: number;
}

const QUERY = `{
  "total": count(*[_type == "agent.conversation"]),
  "avgSuccess": round(math::avg(*[_type == "agent.conversation"].classification.successRate)),
  "avgAgentConfusion": round(math::avg(*[_type == "agent.conversation"].classification.agentConfusion)),
  "avgUserConfusion": round(math::avg(*[_type == "agent.conversation"].classification.userConfusion)),
  "contentGapRate": round(count(*[_type == "agent.conversation" && defined(contentGap)]) / count(*[_type == "agent.conversation"]) * 100)
}`;

interface StatCardProps {
  label: string;
  muted?: boolean;
  value: string | number;
}

function StatCard(props: StatCardProps) {
  const { label, value, muted } = props;

  return (
    <Card padding={4} radius={2} tone="transparent">
      <Stack space={3}>
        <Text muted size={1}>
          {label}
        </Text>

        <Heading muted={muted} size={2}>
          {value}
        </Heading>
      </Stack>
    </Card>
  );
}

export function OverviewView() {
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.fetch<Stats>(QUERY).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [client]);

  if (loading) {
    return (
      <ViewLayout
        description="Summary of agent conversations and performance"
        title="Overview"
      >
        <Flex align="center" justify="center" padding={5}>
          <Spinner muted />
        </Flex>
      </ViewLayout>
    );
  }

  return (
    <ViewLayout
      description="Summary of agent conversations and performance"
      title="Overview"
    >
      <Box>
        <Stack space={4}>
          <Grid columns={[1, 1, 1, 3, 5]} gap={4}>
            <StatCard label="Total Conversations" value={stats?.total ?? 0} />

            <StatCard
              label="Avg Success Rate"
              muted={!stats?.avgSuccess}
              value={`${stats?.avgSuccess ?? 0}%`}
            />

            <StatCard
              label="Avg Agent Confusion"
              muted={!stats?.avgAgentConfusion}
              value={`${stats?.avgAgentConfusion ?? 0}%`}
            />

            <StatCard
              label="Avg User Confusion"
              muted={!stats?.avgUserConfusion}
              value={`${stats?.avgUserConfusion ?? 0}%`}
            />

            <StatCard
              label="Content Gap Rate"
              muted={!stats?.contentGapRate}
              value={`${stats?.contentGapRate ?? 0}%`}
            />
          </Grid>
        </Stack>
      </Box>
    </ViewLayout>
  );
}

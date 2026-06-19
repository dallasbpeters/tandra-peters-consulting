import { Box, Card, Flex, Heading, Stack, Text } from "@sanity/ui";

interface ViewLayoutProps {
  border?: boolean;
  children: React.ReactNode;
  description: string;
  title: string;
}

export function ViewLayout(props: ViewLayoutProps) {
  const { title, description, children, border } = props;

  return (
    <Flex direction="column" gap={2} height="fill" overflow="auto">
      <Card padding={5}>
        <Stack space={4}>
          <Heading>{title}</Heading>

          <Text muted>{description}</Text>
        </Stack>
      </Card>

      <Box flex={1} paddingX={5}>
        <Card border={border} overflow="hidden" radius={3}>
          {children}
        </Card>

        {/* Spacer for bottom padding in scroll context */}
        <Box paddingY={3} />
      </Box>
    </Flex>
  );
}

import { useLayoutEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ConvexClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { useConvexSubscription } from '../hooks/useConvexSubscription';

interface MessageAreaProps {
  convexClient: ConvexClient;
  workspaceId: string | null;
  channelId: string | null;
}

export function MessageArea({ convexClient, workspaceId, channelId }: MessageAreaProps) {
  const [scrollOffset, setScrollOffset] = useState(0);

  const { data: messages } = useConvexSubscription(
    convexClient,
    api.messages.list,
    { channelId },
    !!(channelId && workspaceId)
  );

  const { data: channel } = useConvexSubscription(
    convexClient,
    api.channels.get,
    { channelId },
    !!channelId
  );

  useInput((input, key) => {
    if (!messages) return;

    if (key.pageUp && scrollOffset < messages.length - 1) {
      setScrollOffset(Math.min(scrollOffset + 5, messages.length - 1));
    }
    if (key.pageDown && scrollOffset > 0) {
      setScrollOffset(Math.max(0, scrollOffset - 5));
    }
  });

  useLayoutEffect(() => {
    setScrollOffset(0);
  }, [messages?.length]);

  if (!channelId || !workspaceId) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text color="gray">Select a channel to start chatting</Text>
      </Box>
    );
  }

  if (!messages) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text color="yellow">Loading messages...</Text>
      </Box>
    );
  }

  const visibleMessages = messages.slice(Math.max(0, messages.length - scrollOffset - 10));

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text color="green" bold>
          #{channel?.name || 'unknown-channel'}
        </Text>
        {scrollOffset > 0 && (
          <Text color="yellow"> (showing older messages)</Text>
        )}
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {visibleMessages.map((message, index) => (
          <MessageItem key={message._id || `temp-${index}-${message.content?.slice(0, 10) || 'empty'}`} message={message} />
        ))}
      </Box>

      {messages.length === 0 && (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="gray" italic>
            No messages yet. Start the conversation!
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          PgUp/PgDn: Scroll history • {messages.length} messages
        </Text>
      </Box>
    </Box>
  );
}

function MessageItem({ message }: { message: any }) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box marginBottom={1}>
      <Box width={20}>
        <Text color="blue" bold>
          {message.author?.name || 'Unknown'}
        </Text>
        <Text color="gray" dimColor>
          {' '}[{formatTime(message._creationTime)}]
        </Text>
      </Box>
      <Box flexGrow={1} marginLeft={1}>
        <Text wrap="wrap">
          {message.content || '[encrypted message]'}
        </Text>
      </Box>
    </Box>
  );
}
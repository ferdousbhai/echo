import { useReducer } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { ConvexClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { useConvexSubscription } from '../hooks/useConvexSubscription';

interface MessageInputProps {
  convexClient: ConvexClient;
  workspaceId: string | null;
  channelId: string | null;
  focused: boolean;
}

interface MessageState {
  message: string;
  sending: boolean;
}

type MessageAction =
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'START_SENDING' }
  | { type: 'FINISH_SENDING' }
  | { type: 'CLEAR_MESSAGE' };

function messageReducer(state: MessageState, action: MessageAction): MessageState {
  switch (action.type) {
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'START_SENDING':
      return { ...state, sending: true };
    case 'FINISH_SENDING':
      return { ...state, sending: false };
    case 'CLEAR_MESSAGE':
      return { ...state, message: '', sending: false };
    default:
      return state;
  }
}

export function MessageInput({ convexClient, workspaceId, channelId, focused }: MessageInputProps) {
  const [state, dispatch] = useReducer(messageReducer, {
    message: '',
    sending: false
  });

  const { data: currentUser } = useConvexSubscription(
    convexClient,
    api.users.current,
    {}
  );

  const handleSubmit = async () => {
    if (!state.message.trim() || !channelId || !workspaceId || state.sending) {
      return;
    }

    dispatch({ type: 'START_SENDING' });

    try {
      await convexClient.mutation(api.messages.send, {
        content: state.message.trim(),
        channelId,
      });
      dispatch({ type: 'CLEAR_MESSAGE' });
    } catch (error) {
      console.error('Failed to send message:', error);
      dispatch({ type: 'FINISH_SENDING' });
    }
  };

  if (!currentUser) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="red">Not authenticated</Text>
      </Box>
    );
  }

  if (!channelId || !workspaceId) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="gray">Select a channel to send messages</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1} paddingY={1} flexDirection="row" alignItems="center">
      <Text color="green">
        $ echo "
      </Text>

      {focused ? (
        <TextInput
          value={state.message}
          onChange={(value) => dispatch({ type: 'SET_MESSAGE', payload: value })}
          onSubmit={handleSubmit}
          placeholder="type your message..."
        />
      ) : (
        <Text color="gray">
          {state.message || 'press TAB to focus input'}
        </Text>
      )}

      <Text color="green">
        " &gt;&gt; echo.ch
      </Text>

      {state.sending && (
        <Text color="yellow" marginLeft={1}>
          [sending...]
        </Text>
      )}
    </Box>
  );
}
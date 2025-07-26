import { useReducer, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { ConvexClient } from 'convex/browser';
import { Sidebar } from './Sidebar';
import { MessageArea } from './MessageArea';
import { MessageInput } from './MessageInput';
import { api } from '../../convex/_generated/api';
import { useConvexSubscription } from '../hooks/useConvexSubscription';

interface MainInterfaceProps {
  convexClient: ConvexClient;
}

interface UIState {
  activeWorkspace: string | null;
  activeChannel: string | null;
  sidebarFocused: boolean;
  inputFocused: boolean;
}

type UIAction =
  | { type: 'SET_ACTIVE_WORKSPACE'; payload: string | null }
  | { type: 'SET_ACTIVE_CHANNEL'; payload: string | null }
  | { type: 'FOCUS_SIDEBAR' }
  | { type: 'FOCUS_INPUT' }
  | { type: 'TOGGLE_FOCUS' };

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_ACTIVE_WORKSPACE':
      return { ...state, activeWorkspace: action.payload, activeChannel: null };
    case 'SET_ACTIVE_CHANNEL':
      return { ...state, activeChannel: action.payload };
    case 'FOCUS_SIDEBAR':
      return { ...state, sidebarFocused: true, inputFocused: false };
    case 'FOCUS_INPUT':
      return { ...state, sidebarFocused: false, inputFocused: true };
    case 'TOGGLE_FOCUS':
      return {
        ...state,
        sidebarFocused: !state.sidebarFocused && !state.inputFocused,
        inputFocused: state.sidebarFocused
      };
    default:
      return state;
  }
}

export function MainInterface({ convexClient }: MainInterfaceProps) {
  const [uiState, dispatch] = useReducer(uiReducer, {
    activeWorkspace: null,
    activeChannel: null,
    sidebarFocused: true,
    inputFocused: false
  });

  const { data: workspaces } = useConvexSubscription(
    convexClient,
    api.workspaces.list,
    {}
  );

  const { data: channels } = useConvexSubscription(
    convexClient,
    api.channels.list,
    { workspaceId: uiState.activeWorkspace },
    !!uiState.activeWorkspace
  );

  useEffect(() => {
    if (workspaces?.length > 0 && !uiState.activeWorkspace) {
      dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: workspaces[0]._id });
    }
  }, [workspaces, uiState.activeWorkspace]);

  useEffect(() => {
    if (channels?.length > 0 && !uiState.activeChannel) {
      dispatch({ type: 'SET_ACTIVE_CHANNEL', payload: channels[0]._id });
    }
  }, [channels, uiState.activeChannel]);

  useInput((input, key) => {
    if (key.tab) {
      dispatch({ type: 'TOGGLE_FOCUS' });
    }

    if (key.escape) {
      dispatch({ type: 'FOCUS_SIDEBAR' });
    }
  });

  if (!workspaces || !uiState.activeWorkspace) {
    return (
      <Box justifyContent="center" alignItems="center" height="100%">
        <Text color="yellow">Loading workspaces...</Text>
      </Box>
    );
  }

  return (
    <Box height="100%" flexDirection="row">
      <Box width={25} borderStyle="single" borderColor="blue">
        <Sidebar
          workspaces={workspaces}
          channels={channels || []}
          activeWorkspace={uiState.activeWorkspace}
          activeChannel={uiState.activeChannel}
          onSelectWorkspace={(id) => dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: id })}
          onSelectChannel={(id) => dispatch({ type: 'SET_ACTIVE_CHANNEL', payload: id })}
          focused={uiState.sidebarFocused}
        />
      </Box>

      <Box flexGrow={1} flexDirection="column">
        <Box flexGrow={1} borderStyle="single" borderColor="gray">
          <MessageArea
            convexClient={convexClient}
            workspaceId={uiState.activeWorkspace}
            channelId={uiState.activeChannel}
          />
        </Box>

        <Box height={3} borderStyle="single" borderColor={uiState.inputFocused ? 'green' : 'gray'}>
          <MessageInput
            convexClient={convexClient}
            workspaceId={uiState.activeWorkspace}
            channelId={uiState.activeChannel}
            focused={uiState.inputFocused}
          />
        </Box>
      </Box>

      <Box position="absolute" bottom={0} left={0}>
        <Text color="gray" dimColor>
          TAB: Focus • ESC: Sidebar • Ctrl+C: Quit
        </Text>
      </Box>
    </Box>
  );
}
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface SidebarProps {
  workspaces: any[];
  channels: any[];
  activeWorkspace: string | null;
  activeChannel: string | null;
  onSelectWorkspace: (id: string) => void;
  onSelectChannel: (id: string) => void;
  focused: boolean;
}

export function Sidebar({
  workspaces,
  channels,
  activeWorkspace,
  activeChannel,
  onSelectWorkspace,
  onSelectChannel,
  focused
}: SidebarProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'workspaces' | 'channels'>('workspaces');

  const items = mode === 'workspaces' ? workspaces : channels;
  const maxIndex = items.length - 1;

  useInput((input, key) => {
    if (!focused) return;

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
    if (key.downArrow && selectedIndex < maxIndex) {
      setSelectedIndex(selectedIndex + 1);
    }
    if (key.return && items[selectedIndex]) {
      if (mode === 'workspaces') {
        onSelectWorkspace(items[selectedIndex]._id);
        setMode('channels');
        setSelectedIndex(0);
      } else {
        onSelectChannel(items[selectedIndex]._id);
      }
    }
    if (key.leftArrow && mode === 'channels') {
      setMode('workspaces');
      setSelectedIndex(0);
    }
    if (key.rightArrow && mode === 'workspaces') {
      setMode('channels');
      setSelectedIndex(0);
    }
  }, { isActive: focused });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          {mode === 'workspaces' ? '🏢 WORKSPACES' : '📁 CHANNELS'}
        </Text>
      </Box>

      {items.map((item, index) => {
        const isSelected = focused && index === selectedIndex;
        const isActive = mode === 'workspaces'
          ? item._id === activeWorkspace
          : item._id === activeChannel;

        return (
          <Box key={item._id || `${mode}-${index}-${item.name || 'unnamed'}`} marginBottom={0}>
            <Text
              color={isSelected ? 'black' : isActive ? 'green' : 'white'}
              backgroundColor={isSelected ? 'cyan' : undefined}
              bold={isActive}
            >
              {isSelected ? '▶ ' : '  '}
              {mode === 'workspaces' ? '🏢' : item.isPrivate ? '🔒' : '#'} {item.name}
            </Text>
          </Box>
        );
      })}

      {items.length === 0 && (
        <Text color="gray" italic>
          No {mode} available
        </Text>
      )}

      <Box marginTop={2}>
        <Text color="gray" dimColor>
          ↑↓: Navigate
        </Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>
          ←→: Switch view
        </Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>
          ENTER: Select
        </Text>
      </Box>
    </Box>
  );
}
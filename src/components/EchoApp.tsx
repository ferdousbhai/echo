import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import { ConvexClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { LoginScreen } from './LoginScreen';
import { MainInterface } from './MainInterface';

interface EchoAppProps {
  convexClient: ConvexClient;
}

export function EchoApp({ convexClient }: EchoAppProps) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Simulate loading for dramatic effect
    const timer = setTimeout(() => setLoading(false), 2000);
    
    // Subscribe to current user updates
    const unsubscribe = convexClient.onUpdate(api.users.current, {}, (user) => {
      setCurrentUser(user);
    });
    
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [convexClient]);

  if (loading) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={20}>
        <Gradient name="rainbow">
          <BigText text="ECHO" font="chrome" />
        </Gradient>
        <Text color="gray">Initializing secure terminal interface...</Text>
        <Text color="green">Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header />
      <Box flexGrow={1}>
        {currentUser ? (
          <MainInterface convexClient={convexClient} />
        ) : (
          <LoginScreen convexClient={convexClient} />
        )}
      </Box>
    </Box>
  );
}

function Header() {
  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={2} paddingY={1}>
      <Gradient name="cristal">
        <Text bold>ECHO Terminal v1.0</Text>
      </Gradient>
      <Text color="gray"> | Secure Chat Protocol</Text>
    </Box>
  );
}
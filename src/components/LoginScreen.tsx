import { useReducer, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { ConvexClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

interface LoginScreenProps {
  convexClient: ConvexClient;
}

interface LoginState {
  email: string;
  password: string;
  mode: 'mode-select' | 'email' | 'password' | 'submitting' | 'success';
  isSignup: boolean;
  error: string;
}

type LoginAction =
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_PASSWORD'; payload: string }
  | { type: 'SET_MODE'; payload: LoginState['mode'] }
  | { type: 'TOGGLE_SIGNUP' }
  | { type: 'SET_SIGNUP'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_TO_MODE_SELECT' }
  | { type: 'RESET_TO_EMAIL' };

function loginReducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case 'SET_EMAIL':
      return { ...state, email: action.payload };
    case 'SET_PASSWORD':
      return { ...state, password: action.payload };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'TOGGLE_SIGNUP':
      return { ...state, isSignup: !state.isSignup, error: '' };
    case 'SET_SIGNUP':
      return { ...state, isSignup: action.payload, error: '' };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: '' };
    case 'RESET_TO_MODE_SELECT':
      return { ...state, mode: 'mode-select', email: '', error: '' };
    case 'RESET_TO_EMAIL':
      return { ...state, mode: 'email', password: '', error: '' };
    default:
      return state;
  }
}

export function LoginScreen({ convexClient }: LoginScreenProps) {
  const [state, dispatch] = useReducer(loginReducer, {
    email: '',
    password: '',
    mode: 'mode-select',
    isSignup: false,
    error: ''
  });

  useInput(async (input, key) => {
    if (key.return) {
      if (state.mode === 'mode-select') {
        dispatch({ type: 'SET_MODE', payload: 'email' });
        dispatch({ type: 'CLEAR_ERROR' });
      } else if (state.mode === 'email') {
        if (state.email.includes('@')) {
          dispatch({ type: 'SET_MODE', payload: 'password' });
          dispatch({ type: 'CLEAR_ERROR' });
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Please enter a valid email address' });
        }
      } else if (state.mode === 'password') {
        if (state.password.length >= 6) {
          dispatch({ type: 'SET_MODE', payload: 'submitting' });
          try {
            await convexClient.mutation(api.auth.signIn, { 
              provider: 'password', 
              params: { email: state.email, password: state.password, flow: state.isSignup ? 'signUp' : 'signIn' }
            });
            // Authentication successful
            dispatch({ type: 'SET_MODE', payload: 'success' });
          } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : (state.isSignup ? 'Signup failed' : 'Login failed') });
            dispatch({ type: 'SET_MODE', payload: 'password' });
          }
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Password must be at least 6 characters' });
        }
      }
    } else if (key.upArrow && state.mode === 'mode-select') {
      dispatch({ type: 'SET_SIGNUP', payload: false });
    } else if (key.downArrow && state.mode === 'mode-select') {
      dispatch({ type: 'SET_SIGNUP', payload: true });
    } else if ((input === 'q' || key.ctrl && input === 'c') && state.mode === 'mode-select') {
      process.exit(0);
    } else if (key.escape) {
      if (state.mode === 'password') {
        dispatch({ type: 'RESET_TO_EMAIL' });
      } else if (state.mode === 'email') {
        dispatch({ type: 'RESET_TO_MODE_SELECT' });
      }
    }
  });

  if (state.mode === 'mode-select') {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" paddingY={2}>
        <Box borderStyle="round" borderColor="green" paddingX={4} paddingY={2} flexDirection="column">
          <Box justifyContent="center">
            <Gradient name="rainbow">
              <BigText text="ECHO" font="chrome" />
            </Gradient>
          </Box>
          <Text color="gray" textAlign="center">
            Authentication Portal
          </Text>

          <Box marginTop={2} flexDirection="column" alignItems="center">
            <Box marginBottom={1}>
              <Text color={state.isSignup ? 'gray' : 'cyan'} bold>
                {state.isSignup ? '  ' : '► '}🔐 LOGIN
              </Text>
            </Box>
            <Box>
              <Text color={state.isSignup ? 'cyan' : 'gray'} bold>
                {state.isSignup ? '► ' : '  '}📝 SIGNUP
              </Text>
            </Box>
          </Box>

          {state.error && (
            <Box marginTop={1}>
              <Text color="red">Error: {state.error}</Text>
            </Box>
          )}

          <Box marginTop={2}>
            <Text color="gray">
              <Text color="cyan">↑↓</Text> to navigate | <Text color="cyan">Enter</Text> to continue | <Text color="cyan">Q</Text> to exit
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" paddingY={2}>
      <Box borderStyle="round" borderColor="green" paddingX={4} paddingY={2} flexDirection="column">
        <Text color="green" bold>
          {state.isSignup ? '>>> CREATE ACCOUNT' : '>>> SIGN IN'}
        </Text>
        <Text color="gray">{state.isSignup ? 'Create your Echo account' : 'Welcome back to Echo'}</Text>

        <Box marginTop={2} alignItems="center" justifyContent="center">
          <Text color="cyan" bold>{state.isSignup ? '📝 SIGNUP' : '🔐 LOGIN'}</Text>
        </Box>

        <Box marginTop={2} flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan">Email: </Text>
            {state.mode === 'email' ? (
              <TextInput
                value={state.email}
                onChange={(value) => dispatch({ type: 'SET_EMAIL', payload: value })}
                placeholder="user@example.com"
              />
            ) : (
              <Text color="green">{state.email}</Text>
            )}
          </Box>

          {state.mode !== 'email' && (
            <Box marginBottom={1}>
              <Text color="cyan">Password: </Text>
              {state.mode === 'password' ? (
                <TextInput
                  value={state.password}
                  onChange={(value) => dispatch({ type: 'SET_PASSWORD', payload: value })}
                  mask="*"
                  placeholder="6+ characters"
                  onSubmit={async () => {
                    if (state.password.length >= 6) {
                      dispatch({ type: 'SET_MODE', payload: 'submitting' });
                      try {
                        await convexClient.mutation(api.auth.signIn, { 
                          provider: 'password', 
                          params: { email: state.email, password: state.password, flow: state.isSignup ? 'signUp' : 'signIn' }
                        });
                      } catch (err) {
                        dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : (state.isSignup ? 'Signup failed' : 'Login failed') });
                        dispatch({ type: 'SET_MODE', payload: 'password' });
                      }
                    } else {
                      dispatch({ type: 'SET_ERROR', payload: 'Password must be at least 6 characters' });
                    }
                  }}
                />
              ) : (
                <Text color="green">{'*'.repeat(state.password.length)}</Text>
              )}
            </Box>
          )}

          {state.error && (
            <Box marginTop={1}>
              <Text color="red">Error: {state.error}</Text>
            </Box>
          )}

          <Box marginTop={2}>
            <Text color="gray">
              {state.mode === 'submitting' ? (
                <Text color="yellow">Authenticating...</Text>
              ) : state.mode === 'success' ? (
                <Text color="green">✓ Authentication successful! Loading...</Text>
              ) : (
                <>
                  <Text color="cyan">Enter</Text> to {state.mode === 'email' ? 'continue' : (state.isSignup ? 'create account' : 'sign in')}
                  {(state.mode === 'email' || state.mode === 'password') && ' | '}
                  {(state.mode === 'email' || state.mode === 'password') && <Text color="cyan">Esc</Text>}
                  {(state.mode === 'email' || state.mode === 'password') && ' to go back'}
                </>
              )}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
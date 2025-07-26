#!/usr/bin/env node

import { render } from 'ink';
import { ConvexClient } from 'convex/browser';
import { EchoApp } from './components/EchoApp';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const convexUrl = process.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.error('VITE_CONVEX_URL not found in environment variables');
  process.exit(1);
}

const convex = new ConvexClient(convexUrl);

function App() {
  return <EchoApp convexClient={convex} />;
}

render(<App />);
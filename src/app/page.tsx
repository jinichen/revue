/**
 * Root page component with redirect to dashboard
 */

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}

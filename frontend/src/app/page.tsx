import { redirect } from 'next/navigation';

/** Root "/" redirects straight to the clients list. */
export default function Home() {
  redirect('/clients');
}

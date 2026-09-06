import LandingPage from "./(landing)/LandingPage";
import { getAccessToken } from "@/lib/auth/session";

export default async function Home() {
  const authenticated = Boolean(await getAccessToken());

  return <LandingPage authenticated={authenticated} />;
}

import { useSession } from "../lib/useSession";
import Login from "./Login";

// Wrap your app: <AuthGate><StockCheckScreen /></AuthGate>
export default function AuthGate({ children }) {
  const { session, loading } = useSession();
  if (loading) return <p style={{ padding: 16 }}>Loading…</p>;
  if (!session) return <Login />;
  return children;
}

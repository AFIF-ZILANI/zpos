import { SignIn } from "@clerk/react";
import { useAuth } from "@clerk/react";
import { Redirect } from "wouter";

export default function Login() {
  const { isSignedIn, isLoaded } = useAuth();

  // Already signed in — send to dashboard
  if (isLoaded && isSignedIn) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn routing="hash" />
    </div>
  );
}

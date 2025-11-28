import AuthLoginForm from "@/components/AuthLoginForm";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-white px-4 sm:px-6">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardContent>
          <AuthLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}


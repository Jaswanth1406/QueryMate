import AuthLoginForm from "@/components/AuthLoginForm";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 py-12">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardContent>
            <AuthLoginForm />
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}

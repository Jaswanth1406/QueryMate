import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing and using QueryMate, you accept and agree to be bound by the terms and
              provisions of this agreement. If you do not agree to these terms, please do not use
              our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600">
              QueryMate is an AI-powered chat assistant that provides conversational AI capabilities.
              We reserve the right to modify, suspend, or discontinue the service at any time without
              prior notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 mb-4">To use our service, you must:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Be at least 13 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree not to use QueryMate to:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Generate harmful, abusive, or illegal content</li>
              <li>Attempt to bypass security measures or rate limits</li>
              <li>Impersonate others or misrepresent your affiliation</li>
              <li>Interfere with or disrupt the service</li>
              <li>Collect user data without authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Intellectual Property</h2>
            <p className="text-gray-600">
              The service and its original content, features, and functionality are owned by
              QueryMate and are protected by international copyright, trademark, and other
              intellectual property laws. You retain ownership of content you create using our
              service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. AI-Generated Content</h2>
            <p className="text-gray-600">
              AI responses are generated automatically and may not always be accurate, complete, or
              appropriate. You acknowledge that AI-generated content should not be relied upon for
              medical, legal, financial, or other professional advice. Always verify important
              information from authoritative sources.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-600">
              QueryMate shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages resulting from your use of or inability to use the service. Our total
              liability shall not exceed the amount you paid us in the past twelve months.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Termination</h2>
            <p className="text-gray-600">
              We may terminate or suspend your account immediately, without prior notice, for any
              breach of these Terms. Upon termination, your right to use the service will cease
              immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-600">
              We reserve the right to modify these terms at any time. We will notify users of any
              material changes by posting the new terms on this page. Continued use of the service
              after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:support@querymate.app" className="text-blue-600 hover:underline">
                support@querymate.app
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

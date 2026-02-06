<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";

  let { data } = $props();
</script>

<Navbar
  isHost={data.isHost}
  loggedIn={data.loggedIn}
  isAdmin={data.isAdmin}
  showSignupLogin={data.showSignupLogin}
  studentAccountsEnabled={data.studentAccountsEnabled}
  companyAccountsEnabled={data.companyAccountsEnabled}
/>

<div class="flex flex-col w-full items-center mt-24 px-4 max-w-2xl mx-auto pb-16">
  <h1 class="text-3xl font-bold mb-6">Terms of Service</h1>
  <p class="text-sm text-gray-500 mb-8 text-center">
    Last updated: February 2025. Please review these terms carefully. We recommend
    consulting with legal counsel if you have questions.
  </p>

  <div class="prose prose-sm max-w-none text-left space-y-6 text-gray-700">
    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
      <p>
        By creating an account and using the JobCamp platform, you agree to these
        Terms of Service. If you are a student under 18, your parent or
        guardian should review these terms with you. Continued use of the service constitutes
        acceptance of any changes to these terms.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">2. Description of Service</h2>
      <p>
        JobCamp is a platform that facilitates job shadowing events connecting students with
        local businesses. The service includes event registration, company selection, lottery-based
        placement, and communication between participants. The service is provided for
        educational purposes in connection with job shadowing events.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">3. Account Registration and Responsibilities</h2>
      <p>
        You agree to provide accurate, current, and complete information during registration.
        You are responsible for maintaining the confidentiality of your password and for all
        activity under your account. You must notify JobCamp promptly of any unauthorized
        use of your account.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">4. Acceptable Use</h2>
      <p>
        You agree to use the platform only for lawful purposes and in accordance with these terms.
        You may not: use the service for any fraudulent or unauthorized purpose; attempt to gain
        unauthorized access to any part of the system or other accounts; transmit viruses or
        malicious code; or use the service in any way that could harm, disable, or impair the
        platform or other users.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">5. Disclaimer of Warranties</h2>
      <p>
        The service is provided "as is" and "as available" without warranties of any kind,
        either express or implied. JobCamp does not warrant that the service will be
        uninterrupted, error-free, or free of harmful components. Participation in job shadowing
        activities is at your own risk.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, JobCamp and its affiliates shall
        not be liable for any indirect, incidental, special, consequential, or punitive damages,
        or any loss of profits or revenues. Liability for any claim arising from use of the
        service shall not exceed the amount, if any, paid by you to use the service (typically
        none for students).
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">7. Changes to Terms</h2>
      <p>
        We may modify these terms at any time. We will post the revised terms on this page with
        an updated "Last updated" date. Your continued use of the service after changes are posted
        constitutes acceptance of the modified terms. We encourage you to review this page
        periodically.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">8. Contact</h2>
      <p>
        Questions about these Terms of Service may be directed to
        <a href="mailto:admin@jobcamp.org" class="text-blue-500 underline hover:text-blue-700">admin@jobcamp.org</a>.
      </p>
    </section>
  </div>

  <a href="/signup/student" class="mt-10 text-blue-500 underline hover:text-blue-700"
    >← Back to Sign Up</a
  >
</div>

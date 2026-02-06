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
  <h1 class="text-3xl font-bold mb-6">Privacy Policy</h1>
  <p class="text-sm text-gray-500 mb-8 text-center">
    Last updated: February 2025. Please review this policy carefully. We recommend
    consulting with legal counsel if you have questions.
  </p>

  <div class="prose prose-sm max-w-none text-left space-y-6 text-gray-700">
    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">1. Introduction</h2>
      <p>
        JobCamp ("we," "our," or "us") operates this platform.
        This Privacy Policy explains how we collect, use, disclose, and safeguard information
        when you use our job shadowing event platform. We are committed to protecting the
        privacy of students, parents, and participating businesses.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">2. Information We Collect</h2>
      <p class="mb-2">We collect information you provide directly:</p>
      <ul class="list-disc pl-6 space-y-1 mb-4">
        <li><strong>Students:</strong> Name, email, phone number, grade, graduating class year, and parent/guardian email</li>
        <li><strong>Parents:</strong> Email address and phone number (when provided for permission slips or emergency contact)</li>
        <li><strong>Companies/Hosts:</strong> Company name, contact name, email, phone, and position details</li>
      </ul>
      <p>
        We also automatically collect certain technical information such as IP address, browser
        type, and usage data when you access the platform.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">3. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul class="list-disc pl-6 space-y-1">
        <li>Manage event registration and participation</li>
        <li>Facilitate the lottery-based placement process</li>
        <li>Send event reminders and important updates via email and SMS (with your consent)</li>
        <li>Communicate with parents regarding permission slips and event information</li>
        <li>Enable companies and students to coordinate job shadow placements</li>
        <li>Improve the platform and user experience</li>
        <li>Comply with legal obligations and protect the safety of participants</li>
      </ul>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">4. SMS and Text Messaging</h2>
      <p>
        If you opt in to receive SMS messages from JobCamp, up to 5 SMS reminders will be
        sent over the next two months. Message & data rates may apply. Reply STOP to opt
        out at any time. We use Twilio to deliver SMS messages; Twilio's privacy practices
        are available at twilio.com/legal/privacy.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">5. Information Sharing</h2>
      <p>
        We share information only as necessary to operate the event: company hosts receive
        limited student contact information for their assigned job shadow positions; event
        administrators have access to participant data for event management. We do not sell
        your personal information. We may share information with service providers (such as
        email and SMS providers) who assist in operating the platform under strict
        confidentiality agreements.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">6. Data Retention</h2>
      <p>
        We retain your information for as long as necessary to operate the event and for
        reasonable periods thereafter for archival, compliance, and historical reporting
        purposes. You may contact JobCamp to request deletion of your information,
        subject to any legal retention requirements.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">7. Security</h2>
      <p>
        We implement reasonable technical and organizational measures to protect your
        personal information against unauthorized access, alteration, disclosure, or
        destruction. However, no method of transmission over the Internet or electronic
        storage is 100% secure.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">8. Student Privacy</h2>
      <p>
        JobCamp is used by high school students in grades 9–12 (typically ages 14–18).
        We collect student information in the context of educational job shadowing
        activities. Parental consent is obtained for participation, and we encourage
        parents to review this policy and discuss it with their students. Parents may
        contact JobCamp to review, correct, or request deletion of their student's
        information.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">9. Your Choices</h2>
      <p>
        You can opt out of SMS messages at any time by replying STOP. You may choose not to
        provide certain information, though this may limit your ability to participate in
        JobCamp events. You may contact JobCamp to request access to or correction of
        your personal information.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the revised policy
        on this page with an updated "Last updated" date. We encourage you to review this
        policy periodically. Continued use of the service after changes constitutes
        acceptance of the updated policy.
      </p>
    </section>

    <section>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">11. Contact Us</h2>
      <p>
        Questions about this Privacy Policy or our data practices may be directed to
        <a href="mailto:admin@jobcamp.org" class="text-blue-500 underline hover:text-blue-700">admin@jobcamp.org</a>.
      </p>
    </section>
  </div>

  <a href="/signup/student" class="mt-10 text-blue-500 underline hover:text-blue-700"
    >← Back to Sign Up</a
  >
</div>

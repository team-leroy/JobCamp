<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";

  const { data } = $props();
  const isHost = $derived(data.isHost);
  const loggedIn = $derived(data.loggedIn);
  const isAdmin = $derived(data.isAdmin);
</script>

<Navbar
  {isHost}
  {loggedIn}
  {isAdmin}
  showSignupLogin={data.showSignupLogin}
  studentAccountsEnabled={data.studentAccountsEnabled}
  companyAccountsEnabled={data.companyAccountsEnabled}
/>

<main class="w-full mt-20 p-4 flex flex-col gap-2">
  <h1 class="text-4xl text-center my-3">Host Tips</h1>

  <div>
    First of all, <span class="font-bold">THANK YOU</span> for considering being
    a host to high school students! This is a unique opportunity for students to
    learn more about possible careers and majors and it’s hard to do without helpful
    professionals like yourself.
  </div>
  <hr class="w-full h-0 border-b" />

  <div><font size="+2">Tips for signing up:</font></div>
  <div>
    <p>
      One person from your organization needs to create a JobCamp account using
      an email address and password. The account creator will then create one or
      more "positions." Each position is for a certain number of students, a
      certain number of hours, and to shadow one or more career types. Each
      position has a host contact - name, email, and phone number. The contact's
      name and email is only shared with students selected to visit you on job
      shadow day.
    </p>
  </div>
  <div>
    <p>
      For example, if you are a school and have one teacher that will host one
      student, then the host contact name, email, and phone for that single
      position should be the teacher. If you have a large company and students
      will rotate between marketing, finance, engineering, and manufacturing,
      then you can create one "Multiple Career" position and list what the
      student will see.
    </p>
  </div>
  <hr class="w-full h-0 border-b" />

  <div><font size="+2">Tips for job shadow day:</font></div>
  <div>
    If you are interested in hosting some students for a job shadow event, here
    are some suggestions based on previous programs. Every company and position
    is unique, so do what works best for you!
  </div>

  <ol class="list-decimal ml-8 flex flex-col gap-2">
    <li>
      Start the day with an orientation and introductions. Tell students a
      little bit about yourself and ask them some questions as well. Make the
      students feel welcome and at ease with you and your colleagues. Encourage
      students to ask questions.
    </li>
    <li>
      Give the students a tour and overview of your office or business and
      explain the roles of each person to which they are introduced.
    </li>
    <li>
      Show students what a typical day at your job entails. Here are some
      ideas/things to consider:
      <ul class="list-disc ml-8 flex flex-col gap-1">
        <li>
          Describe your “typical” day and be prepared to field questions
          regarding salaries, promotions, schooling, etc.
        </li>
        <li>Have the students perform some hands-on/engaging tasks.</li>
        <li>Interact with a client and have the students observe.</li>
        <li>
          Help student learn as they observe. Don’t assume that they know. Use
          language that the student can understand and try to avoid technical
          jargon.
        </li>
        <li>
          Rotate through various departments/careers, if that is an option.
        </li>
      </ul>
    </li>
    <li>
      Be specific on your expectations of students’ dress, behavior, and
      activities. If jeans and sneakers are frowned upon in your office, please
      state this in the position description. If students are expected to
      interact with customers or clients or patients, state this. If students
      need to bring a bagged lunch to quickly eat between activities, make this
      clear. Be specific about what time to arrive, where to be, and any forms
      that may be needed.
    </li>
    <li>
      Here are some other topics to discuss with students:
      <ul class="list-disc ml-8 flex flex-col gap-1">
        <li>
          Explain how your work relates to classes they might be taking in
          school.
        </li>
        <li>
          Share examples of your daily routine that incorporates skills they are
          learning such as communication, critical thinking, problem solving,
          teamwork, writing, etc.
        </li>
        <li>
          Tell students about yourself, where you went to school, some work and
          college experiences (internships, first jobs, etc.) and why you chose
          this field as your career.
        </li>
        <li>
          Explain what you like about your job as well as some of the
          disadvantages to your career field.
        </li>
        <li>
          Host an optional lunch – this is a great way to end the day and recap.
        </li>
      </ul>
    </li>
  </ol>
</main>

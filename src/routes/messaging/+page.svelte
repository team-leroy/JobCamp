<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import FilterSelect from "$lib/components/ui/filter-select/FilterSelect.svelte";
  import { enhance } from "$app/forms";
  import { Mail, MessageSquare, Users, Eye } from "lucide-svelte";

  interface PageData {
    isAdmin: boolean;
    loggedIn: boolean;
    isHost: boolean;
    userRole: string | null;
    schoolId: string;
    activeEvent: { id: string; name: string | null; date: Date } | null;
    hasLotteryResults: boolean;
    students: Array<{ id: string; name: string; email: string }>;
    companies: Array<{ id: string; name: string }>;
  }

  interface FormResult {
    success?: boolean;
    message?: string;
    count?: number;
    preview?: Array<{ name: string; email?: string; phone?: string }>;
    data?: string;
  }

  let { data, form = null }: { data: PageData; form?: FormResult | null } =
    $props();

  const isAdmin = $derived(data.isAdmin);
  const loggedIn = $derived(data.loggedIn);
  const isHost = $derived(data.isHost);
  const userRole = $derived(data.userRole);
  const activeEvent = $derived(data.activeEvent);
  const hasLotteryResults = $derived(data.hasLotteryResults);
  const students = $derived(data.students);
  const companies = $derived(data.companies);

  let activeTab = $state("student");
  let messageType = $state("email"); // 'email' or 'sms'
  let recipientType = $state("all_students");
  let includeParents = $state(false);
  let subject = $state("");
  let message = $state("");
  let previewData = $state<FormResult | null>(null);

  // Individual message states
  let individualRecipientType = $state("student");
  let selectedStudentId = $state("");
  let selectedCompanyId = $state("");
  let individualSubject = $state("");
  let individualMessage = $state("");
  let loadedData = $state("");

  // Company message states
  let companySubject = $state("");
  let companyMessage = $state("");
  let companyPreviewData = $state<FormResult | null>(null);
  let lastLoadedCompanyGroup = $state("");

  const studentRecipientOptions = [
    { value: "all_students", label: "All Students with Accounts" },
    {
      value: "incomplete_permission_slip",
      label: "Students - Incomplete Permission Slip",
    },
    { value: "no_job_picks", label: "Students - No Job Picks" },
    { value: "few_picks", label: "Students - Fewer Than 3 Picks" },
    { value: "few_slots", label: "Students - Total Slots < 5" },
  ];

  const companyRecipientOptions = [
    { value: "all_companies", label: "All Companies" },
    { value: "published_positions", label: "Companies with Published Positions" },
    { value: "draft_positions", label: "Companies with Draft Positions" },
    { value: "no_positions", label: "Companies with No Position" },
    { value: "students_attending", label: "Companies with Students Attending" },
  ];

  let companyRecipientType = $state("all_companies");

  $effect(() => {
    if (
      activeTab === "company" &&
      companyRecipientType === "students_attending" &&
      lastLoadedCompanyGroup !== "students_attending"
    ) {
      handleLoadCompanyTemplate("students_attending");
      lastLoadedCompanyGroup = "students_attending";
    } else if (
      activeTab === "company" &&
      companyRecipientType !== "students_attending"
    ) {
      lastLoadedCompanyGroup = "";
    }
  });

  function setTab(tab: string) {
    activeTab = tab;
    // Reset form when changing tabs
    previewData = null;
    companyPreviewData = null;
  }

  async function handlePreview(formElement: HTMLFormElement) {
    const formData = new FormData(formElement);

    try {
      const response = await fetch("/messaging?/previewRecipients", {
        method: "POST",
        body: formData,
        headers: {
          "x-sveltekit-action": "true",
        },
      });

      const result = await response.json();

      // SvelteKit uses devalue serialization - need to deserialize properly
      if (result.type === "success" && result.data) {
        const { deserialize } = await import("$app/forms");
        const deserialized = deserialize(JSON.stringify(result));

        if (deserialized.type === "success" && deserialized.data) {
          const actionResult = deserialized.data;

          if (actionResult.success) {
            previewData = {
              count: actionResult.count as number,
              preview: actionResult.preview as Array<{
                name: string;
                email?: string;
                phone?: string;
              }>,
            };
          } else {
            console.error("Preview failed:", actionResult.message);
            previewData = null;
          }
        }
      } else {
        console.error("Preview failed: Invalid response format");
        previewData = null;
      }
    } catch (error) {
      console.error("Error fetching preview:", error);
      previewData = null;
    }
  }

  async function handleCompanyPreview(formElement: HTMLFormElement) {
    const formData = new FormData(formElement);
    // recipientType is already bound to companyRecipientType hidden input

    try {
      const response = await fetch("/messaging?/previewRecipients", {
        method: "POST",
        body: formData,
        headers: {
          "x-sveltekit-action": "true",
        },
      });

      const result = await response.json();

      // SvelteKit uses devalue serialization - need to deserialize properly
      if (result.type === "success" && result.data) {
        const { deserialize } = await import("$app/forms");
        const deserialized = deserialize(JSON.stringify(result));

        if (deserialized.type === "success" && deserialized.data) {
          const actionResult = deserialized.data;

          if (actionResult.success) {
            companyPreviewData = {
              count: actionResult.count as number,
              preview: actionResult.preview as Array<{
                name: string;
                email?: string;
                phone?: string;
              }>,
            };
          } else {
            console.error("Company preview failed:", actionResult.message);
            companyPreviewData = null;
          }
        }
      } else {
        console.error("Company preview failed: Invalid response format");
        companyPreviewData = null;
      }
    } catch (error) {
      console.error("Error fetching company preview:", error);
      companyPreviewData = null;
    }
  }

  async function handleLoadCompanyTemplate(group: string) {
    if (!group) return;

    const formData = new FormData();
    formData.append("group", group);

    try {
      const response = await fetch("/messaging?/loadCompanyTemplate", {
        method: "POST",
        body: formData,
        headers: {
          "x-sveltekit-action": "true",
        },
      });

      const result = await response.json();

      if (result.type === "success" && result.data) {
        const { deserialize } = await import("$app/forms");
        const deserialized = deserialize(JSON.stringify(result));

        if (deserialized.type === "success" && deserialized.data) {
          const actionResult = deserialized.data;
          if (actionResult.success && actionResult.data) {
            // Set subject and message if they are empty or for students_attending
            if (group === "students_attending") {
              const eventDate = activeEvent ? new Date(activeEvent.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC"
              }) : "{Event date}";
              companySubject = `${eventDate}: Students selected for your JobCamp session`;
              companyMessage = actionResult.data;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading company template:", error);
    }
  }

  async function handleLoadIndividualData() {
    const recipientId =
      individualRecipientType === "student"
        ? selectedStudentId
        : selectedCompanyId;

    if (!recipientId) {
      return;
    }

    const formData = new FormData();
    formData.append("recipientId", recipientId);
    formData.append("recipientType", individualRecipientType);

    const response = await fetch("/messaging?/loadIndividualData", {
      method: "POST",
      body: formData,
      headers: {
        "x-sveltekit-action": "true",
      },
    });

    const result = await response.json();

    // Deserialize SvelteKit form action response
    if (result.type === "success" && result.data) {
      const { deserialize } = await import("$app/forms");
      const deserialized = deserialize(result.data);

      // Devalue deserializes to an array where:
      // [0] = reference map, [1] = success value, [2] = data value
      if (Array.isArray(deserialized) && deserialized[1] && deserialized[2]) {
        loadedData = deserialized[2];
        // Insert into message if empty
        if (!individualMessage) {
          individualMessage = loadedData;
        }
      }
    }
  }

  // Character counter for SMS
  const smsCharCount = $derived(message.length);
  const smsWarning = $derived(smsCharCount > 160);
</script>

<Navbar {isAdmin} {loggedIn} {isHost} {userRole} />

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-6xl w-full px-4">
    <h1 class="text-3xl font-bold mb-6">Admin Messaging</h1>

    {#if !activeEvent}
      <Card>
        <CardContent class="pt-6">
          <p class="text-gray-600">
            No active event found. Please activate an event to send messages.
          </p>
        </CardContent>
      </Card>
    {:else}
      <div class="mb-4 p-4 bg-blue-50 rounded-lg">
        <p class="font-medium">
          Active Event: {activeEvent.name || "Unnamed Event"}
        </p>
        <p class="text-sm text-gray-600">
          Date: {new Date(activeEvent.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })}
        </p>
      </div>

      {#if form?.message}
        <div
          class="mb-4 p-3 rounded-md {form.success
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'}"
        >
          {form.message}
        </div>
      {/if}

      <!-- Tab Navigation -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab ===
            'student'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => setTab("student")}
          >
            <Users class="inline h-4 w-4 mr-1" />
            Student Messages
          </button>
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab ===
            'company'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => setTab("company")}
          >
            <Mail class="inline h-4 w-4 mr-1" />
            Company Messages
          </button>
          {#if hasLotteryResults}
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {activeTab ===
              'lottery'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              onclick={() => setTab("lottery")}
            >
              <MessageSquare class="inline h-4 w-4 mr-1" />
              Post-Lottery
            </button>
          {/if}
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab ===
            'individual'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => setTab("individual")}
          >
            <Mail class="inline h-4 w-4 mr-1" />
            Individual
          </button>
        </nav>
      </div>

      <!-- Student Messages Tab -->
      {#if activeTab === "student"}
        <Card>
          <CardHeader>
            <CardTitle>Student Messages (Email & SMS)</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              method="POST"
              action="?/sendStudentMessage"
              class="space-y-4"
              use:enhance
            >
              <div>
                <FilterSelect
                  label="Recipient Group"
                  options={studentRecipientOptions}
                  bind:value={recipientType}
                  placeholder="Select recipients"
                />
                <input
                  type="hidden"
                  name="recipientType"
                  bind:value={recipientType}
                />
              </div>

              <div>
                <Label>Message Type</Label>
                <div class="flex gap-4">
                  <label class="flex items-center">
                    <input
                      type="radio"
                      name="messageType"
                      value="email"
                      bind:group={messageType}
                      class="mr-2"
                    />
                    Email
                  </label>
                  <label class="flex items-center">
                    <input
                      type="radio"
                      name="messageType"
                      value="sms"
                      bind:group={messageType}
                      class="mr-2"
                    />
                    SMS
                  </label>
                </div>
              </div>

              {#if messageType === "email"}
                <div class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeParents"
                    name="includeParents"
                    value="true"
                    bind:checked={includeParents}
                    class="h-4 w-4 rounded"
                  />
                  <Label for="includeParents">Also send to parent emails</Label>
                </div>

                <div>
                  <Label for="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    bind:value={subject}
                    required
                    placeholder="Email subject..."
                  />
                </div>
              {/if}

              <div>
                <Label for="message">
                  Message
                  {#if messageType === "sms"}
                    <span
                      class="text-xs {smsWarning
                        ? 'text-red-600'
                        : 'text-gray-500'}"
                    >
                      ({smsCharCount}/160 characters)
                    </span>
                  {/if}
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  bind:value={message}
                  required
                  rows={messageType === "sms" ? 4 : 8}
                  placeholder={messageType === "sms"
                    ? "SMS message (keep under 160 characters)..."
                    : "Email message..."}
                />
                {#if messageType === "sms"}
                  <p class="text-xs text-gray-500 mt-1">
                    Only students who opted in to SMS will receive this message
                  </p>
                {/if}
              </div>

              <!-- Preview Recipients Button -->
              <div class="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onclick={(e: MouseEvent) => {
                    const form = (e.currentTarget as HTMLElement).closest(
                      "form"
                    );
                    if (form) {
                      handlePreview(form);
                    }
                  }}
                >
                  <Eye class="h-4 w-4 mr-2" />
                  Preview Recipients
                </Button>
                <Button type="submit">
                  {messageType === "email" ? "Send Email" : "Send SMS"}
                </Button>
              </div>

              {#if previewData && previewData.count !== undefined}
                <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p class="font-medium">
                    Will send to {previewData.count} recipient(s)
                  </p>
                  {#if previewData.preview && previewData.preview.length > 0}
                    <div class="mt-2 text-sm text-gray-600">
                      <p class="font-medium">Preview (first 10):</p>
                      <ul class="list-disc list-inside mt-1">
                        {#each previewData.preview as recipient}
                          <li>
                            {recipient.name}
                            {#if messageType === "email"}
                              ({recipient.email})
                            {:else}
                              ({recipient.phone})
                            {/if}
                          </li>
                        {/each}
                      </ul>
                      {#if previewData.count > 10}
                        <p class="mt-1 italic">
                          ...and {previewData.count - 10} more
                        </p>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            </form>
          </CardContent>
        </Card>
      {/if}

      <!-- Company Messages Tab -->
      {#if activeTab === "company"}
        <Card>
          <CardHeader>
            <CardTitle>Company Messages (Email)</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              method="POST"
              action="?/sendCompanyMessage"
              class="space-y-4"
              use:enhance
            >
              <div>
                <FilterSelect
                  label="Recipient Group"
                  options={companyRecipientOptions}
                  bind:value={companyRecipientType}
                  placeholder="Select recipients"
                />
                <input
                  type="hidden"
                  name="recipientType"
                  bind:value={companyRecipientType}
                />
              </div>

              {#if companyRecipientType === "students_attending"}
                <div class="p-3 bg-purple-50 rounded-md text-xs border border-purple-200">
                  <p class="font-medium text-purple-800">Mail Merge Template:</p>
                  <p class="mt-1">
                    The tags <code>&#123;host_name&#125;</code>, <code>&#123;event_date&#125;</code>, <code>&#123;num_students&#125;</code>, and <code>&#123;student_list&#125;</code> will be automatically replaced for each company.
                  </p>
                </div>
              {/if}

              <div>
                <Label for="company-subject">Subject</Label>
                <Input
                  id="company-subject"
                  name="subject"
                  bind:value={companySubject}
                  required
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <Label for="company-message">Message</Label>
                <Textarea
                  id="company-message"
                  name="message"
                  bind:value={companyMessage}
                  required
                  rows={10}
                  placeholder="Email message..."
                />
              </div>

              <!-- Preview Recipients Button -->
              <div class="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onclick={(e: MouseEvent) => {
                    const form = (e.currentTarget as HTMLElement).closest(
                      "form"
                    );
                    if (form) {
                      handleCompanyPreview(form);
                    }
                  }}
                >
                  <Eye class="h-4 w-4 mr-2" />
                  Preview Recipients
                </Button>
                <Button type="submit">
                  <Mail class="h-4 w-4 mr-2" />
                  Send Email to Group
                </Button>
              </div>

              {#if companyPreviewData && companyPreviewData.count !== undefined}
                <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p class="font-medium">
                    Will send to {companyPreviewData.count} recipient(s)
                  </p>
                  {#if companyPreviewData.preview && companyPreviewData.preview.length > 0}
                    <div class="mt-2 text-sm text-gray-600">
                      <p class="font-medium">Preview (first 10):</p>
                      <ul class="list-disc list-inside mt-1">
                        {#each companyPreviewData.preview as recipient}
                          <li>
                            {recipient.name} ({recipient.email})
                          </li>
                        {/each}
                      </ul>
                      {#if companyPreviewData.count > 10}
                        <p class="mt-1 italic">
                          ...and {companyPreviewData.count - 10} more
                        </p>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            </form>
          </CardContent>
        </Card>
      {/if}

      <!-- Post-Lottery Messages Tab -->
      {#if activeTab === "lottery" && hasLotteryResults}
        <Card>
          <CardHeader>
            <CardTitle>Post-Lottery Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-6">
              <!-- Assigned Students -->
              <div class="border rounded-lg p-4">
                <h3 class="font-medium mb-3">Students Assigned to Positions</h3>
                <form
                  method="POST"
                  action="?/sendStudentMessage"
                  class="space-y-4"
                  use:enhance
                >
                  <input
                    type="hidden"
                    name="recipientType"
                    value="lottery_assigned"
                  />
                  <input type="hidden" name="messageType" value="email" />

                  <div class="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeParentsAssigned"
                      name="includeParents"
                      value="true"
                      class="h-4 w-4 rounded"
                    />
                    <Label for="includeParentsAssigned"
                      >Also send to parent emails</Label
                    >
                  </div>

                  <div>
                    <Label for="assigned-subject">Subject</Label>
                    <Input
                      id="assigned-subject"
                      name="subject"
                      required
                      placeholder="Congratulations! Your job assignment is ready"
                    />
                  </div>

                  <div>
                    <Label for="assigned-message">Message</Label>
                    <Textarea
                      id="assigned-message"
                      name="message"
                      required
                      rows={6}
                      placeholder="Message for students who were assigned..."
                    />
                    <p class="text-xs text-gray-500 mt-1">
                      You can include position details manually or students can
                      view them on their dashboard
                    </p>
                  </div>

                  <Button type="submit">Send to Assigned Students</Button>
                </form>
              </div>

              <!-- Unassigned Students -->
              <div class="border rounded-lg p-4">
                <h3 class="font-medium mb-3">Students Not Assigned</h3>
                <form
                  method="POST"
                  action="?/sendStudentMessage"
                  class="space-y-4"
                  use:enhance
                >
                  <input
                    type="hidden"
                    name="recipientType"
                    value="lottery_unassigned"
                  />
                  <input type="hidden" name="messageType" value="email" />

                  <div class="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeParentsUnassigned"
                      name="includeParents"
                      value="true"
                      class="h-4 w-4 rounded"
                    />
                    <Label for="includeParentsUnassigned"
                      >Also send to parent emails</Label
                    >
                  </div>

                  <div>
                    <Label for="unassigned-subject">Subject</Label>
                    <Input
                      id="unassigned-subject"
                      name="subject"
                      required
                      placeholder="Job Shadow Day - Available Positions"
                    />
                  </div>

                  <div>
                    <Label for="unassigned-message">Message</Label>
                    <Textarea
                      id="unassigned-message"
                      name="message"
                      required
                      rows={6}
                      placeholder="Message for students who were not assigned (e.g., link to available positions)..."
                    />
                  </div>

                  <Button type="submit">Send to Unassigned Students</Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      {/if}

      <!-- Individual Messages Tab -->
      {#if activeTab === "individual"}
        <Card>
          <CardHeader>
            <CardTitle>Individual Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              method="POST"
              action="?/sendIndividualMessage"
              class="space-y-4"
              use:enhance={() => {
                return async ({ result }) => {
                  if (result.type === "success") {
                    // Clear form after successful send
                    individualRecipientType = "student"; // Reset to default
                    selectedStudentId = "";
                    selectedCompanyId = "";
                    individualSubject = "";
                    individualMessage = "";
                    loadedData = "";
                  }
                };
              }}
            >
              <div>
                <Label>Recipient Type</Label>
                <div class="flex gap-4">
                  <label class="flex items-center">
                    <input
                      type="radio"
                      bind:group={individualRecipientType}
                      value="student"
                      class="mr-2"
                      onchange={() => {
                        loadedData = "";
                        individualMessage = "";
                      }}
                    />
                    Student
                  </label>
                  <label class="flex items-center">
                    <input
                      type="radio"
                      bind:group={individualRecipientType}
                      value="company"
                      class="mr-2"
                      onchange={() => {
                        loadedData = "";
                        individualMessage = "";
                      }}
                    />
                    Company
                  </label>
                </div>
                <input
                  type="hidden"
                  name="recipientType"
                  value={individualRecipientType}
                />
              </div>

              {#if individualRecipientType === "student"}
                <div>
                  <Label for="student-select">Select Student</Label>
                  <select
                    id="student-select"
                    name="recipientId"
                    bind:value={selectedStudentId}
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md"
                    onchange={() => handleLoadIndividualData()}
                  >
                    <option value="">-- Select a student --</option>
                    {#each students as student}
                      <option value={student.id}>{student.name}</option>
                    {/each}
                  </select>
                </div>
              {:else}
                <div>
                  <Label for="company-select">Select Company</Label>
                  <select
                    id="company-select"
                    name="recipientId"
                    bind:value={selectedCompanyId}
                    required
                    class="w-full px-3 py-2 border border-gray-300 rounded-md"
                    onchange={() => handleLoadIndividualData()}
                  >
                    <option value="">-- Select a company --</option>
                    {#each companies as company}
                      <option value={company.id}>{company.name}</option>
                    {/each}
                  </select>
                </div>
              {/if}

              {#if loadedData}
                <div class="p-3 bg-gray-50 rounded-md">
                  <p class="font-medium text-sm mb-2">Loaded Data:</p>
                  <pre
                    class="text-xs text-gray-700 whitespace-pre-wrap">{loadedData}</pre>
                </div>
              {/if}

              <div>
                <Label for="individual-subject">Subject</Label>
                <Input
                  id="individual-subject"
                  name="subject"
                  bind:value={individualSubject}
                  required
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <Label for="individual-message">Message</Label>
                <Textarea
                  id="individual-message"
                  name="message"
                  bind:value={individualMessage}
                  required
                  rows={12}
                  placeholder="Email message (data auto-inserted above when you select a recipient)..."
                />
                <p class="text-xs text-gray-500 mt-1">
                  The loaded data is editable. Modify as needed before sending.
                </p>
              </div>

              <Button type="submit">Send Email</Button>
            </form>
          </CardContent>
        </Card>
      {/if}
    {/if}
  </div>
</div>

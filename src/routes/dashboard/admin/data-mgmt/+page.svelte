<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronUp,
    Mail,
    Phone,
    User,
    Calendar,
    Target,
    CheckCircle,
    Clock,
    XCircle,
    AlertTriangle,
    Briefcase,
  } from "lucide-svelte";
  import StudentEditModal from "./StudentEditModal.svelte";
  import CompanyEditModal from "./CompanyEditModal.svelte";
  import HostEditModal from "./HostEditModal.svelte";
  import PositionEditModal from "./PositionEditModal.svelte";
  import CreatePositionModal from "./CreatePositionModal.svelte";
  import FilterSelect from "$lib/components/ui/filter-select/FilterSelect.svelte";
  import FilteredStudentMessenger from "$lib/components/admin/FilteredStudentMessenger.svelte";
  import FilteredCompanyMessenger from "$lib/components/admin/FilteredCompanyMessenger.svelte";
  import { MessageSquare } from "lucide-svelte";
  import * as Dialog from "$lib/components/ui/dialog";

  interface Student {
    id: string;
    firstName: string;
    lastName: string;
    grade: number;
    phone: string;
    email: string;
    emailVerified: boolean;
    parentEmail: string;
    permissionSlipStatus: string;
    permissionSlipCode: string | null;
    permissionSlipDate: Date | null;
    lastLogin: Date | null;
    accountCreated: string | null;
    lastChoicesUpdate: string | null;
    studentPicks: Array<{
      rank: number;
      positionId: string;
      title: string;
      companyName: string;
      career: string;
    }>;
    lotteryAssignment: {
      positionId: string;
      title: string;
      companyName: string;
      career: string;
      assignedAt: Date;
    } | null;
    lotteryStatus: string;
    isInternalTester: boolean;
    eventIds: string[];
  }

  interface Company {
    id: string;
    companyName: string;
    companyDescription: string;
    companyUrl: string;
    activePositionCount: number;
    activeSlotsCount: number;
    activePositions: Position[];
    hosts: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      lastLogin: string | null;
      isInternalTester: boolean;
      positions: Position[];
    }[];
    isInternalTester: boolean;
    emailVerified: boolean;
    eventIds: string[];
  }

  interface Event {
    id: string;
    name: string | null;
    date: string;
    isActive: boolean;
  }

  interface Host {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    lastLogin: Date | string | null;
    isInternalTester: boolean;
    companyName: string;
    eventIds: string[];
  }

  interface Attachment {
    id: string;
    fileName: string;
    storagePath: string;
  }

  interface Position {
    id: string;
    title: string;
    career: string;
    slots: number;
    summary: string;
    contactName: string;
    contactEmail: string;
    address: string;
    instructions: string;
    attire: string;
    arrival: string;
    start: string;
    end: string;
    eventId: string;
    createdAt: Date | string;
    publishedAt: Date | string | null;
    hostName: string;
    companyName: string;
    isPublished: boolean;
    isInternalTester: boolean;
    attachments: Attachment[];
  }

  interface Props {
    data: {
      hasActiveEvent: boolean;
      activeEvent: {
        id: string;
        name: string;
        date: Date;
      } | null;
      allEvents: Event[];
      students: Student[];
      totalStudents: number;
      companies: Company[];
      totalCompanies: number;
      hosts: Host[];
      totalHosts: number;
      positions: Position[];
      totalPositions: number;
      careers: string[];
      isAdmin: boolean;
      loggedIn: boolean;
      isHost: boolean;
      userRole: string | null;
      canEdit: boolean;
    };
  }

  let { data }: Props = $props();
  const isAdmin = $derived(data.isAdmin);
  const loggedIn = $derived(data.loggedIn);
  const isHost = $derived(data.isHost);
  const userRole = $derived(data.userRole);
  const canEdit = $derived(data.canEdit);

  // Memoize event options for filters
  const eventOptions = $derived([
    { value: "All", label: "All Events" },
    ...data.allEvents.map((event) => ({
      value: event.id,
      label: event.name || `Event ${new Date(event.date).toLocaleDateString()}`,
    })),
  ]);

  // Filter states for Student
  let lastNameFilter = $state("");
  let gradeFilter = $state("All");
  let permissionSlipFilter = $state("All");
  let lotteryStatusFilter = $state("All");
  let emailVerifiedFilter = $state("All");
  let studentEventFilter = $state(data.activeEvent?.id || "All");

  // Filter states for Company (Consolidated)
  let companyNameFilter = $state("");
  let hostNameFilter = $state("");
  let positionTitleFilter = $state("");
  let companyEmailVerifiedFilter = $state("All");
  let positionStatusFilter = $state("All");
  let companyEventFilter = $state(data.activeEvent?.id || "All");

  // Global Filter for Internal Testers
  let showInternalTesters = $state(false);

  // UI states
  let expandedStudents = $state(new Set<string>());
  let expandedCompanies = $state(new Set<string>()); // This will now track expanded positions within companies
  let selectedTab = $state("Student");
  let showMessengerDialog = $state(false);
  let showCompanyMessengerDialog = $state(false);

  // Pagination states
  let studentPage = $state(1);
  let companyPage = $state(1);
  const pageSize = 50;

  // Student sort state (default: lastLogin desc = most recent first)
  let studentSortBy = $state<'lastLogin' | 'lastChoices' | 'accountCreated'>('lastLogin');
  let studentSortDir = $state<'asc' | 'desc'>('desc');

  // Computed filtered students
  let filteredStudents = $derived(
    data.students.filter((student) => {
      const matchesLastName =
        !lastNameFilter ||
        student.lastName.toLowerCase().includes(lastNameFilter.toLowerCase());

      const matchesGrade =
        gradeFilter === "All" || student.grade.toString() === gradeFilter;

      const matchesPermissionSlip =
        permissionSlipFilter === "All" ||
        student.permissionSlipStatus === permissionSlipFilter;

      const matchesLotteryStatus =
        lotteryStatusFilter === "All" ||
        student.lotteryStatus === lotteryStatusFilter;

      const matchesEmailVerified =
        emailVerifiedFilter === "All" ||
        (emailVerifiedFilter === "Verified" && student.emailVerified) ||
        (emailVerifiedFilter === "Unverified" && !student.emailVerified);

      const matchesEvent =
        studentEventFilter === "All" ||
        student.eventIds.includes(studentEventFilter);

      const matchesTester = showInternalTesters || !student.isInternalTester;

      return (
        matchesLastName &&
        matchesGrade &&
        matchesPermissionSlip &&
        matchesLotteryStatus &&
        matchesEmailVerified &&
        matchesEvent &&
        matchesTester
      );
    }),
  );

  // Sorted filtered students
  let sortedFilteredStudents = $derived.by(() => {
    const list = [...filteredStudents];
    const dir = studentSortDir === 'desc' ? -1 : 1;
    const nullVal = studentSortDir === 'desc' ? -Infinity : Infinity;
    const getVal = (s: Student) => {
      const raw =
        studentSortBy === 'lastChoices'
          ? s.lastChoicesUpdate
          : studentSortBy === 'lastLogin'
            ? s.lastLogin
            : s.accountCreated;
      return raw ? new Date(raw).getTime() : nullVal;
    };
    list.sort((a, b) => dir * (getVal(a) - getVal(b)));
    return list;
  });

  let paginatedStudents = $derived(
    sortedFilteredStudents.slice(0, studentPage * pageSize),
  );

  // Computed filtered companies (Consolidated)
  let filteredCompanies = $derived(
    data.companies.filter((company) => {
      // 1. Company Name Search
      const matchesCompanyName =
        !companyNameFilter ||
        company.companyName
          .toLowerCase()
          .includes(companyNameFilter.toLowerCase());

      // 2. Host Name Search
      const matchesHostName =
        !hostNameFilter ||
        company.hosts.some((host) =>
          host.name.toLowerCase().includes(hostNameFilter.toLowerCase()),
        );

      // 3. Position Title Search
      const matchesPositionTitle =
        !positionTitleFilter ||
        company.activePositions.some((pos) =>
          pos.title.toLowerCase().includes(positionTitleFilter.toLowerCase()),
        );

      // 4. Email Verified Filter
      const matchesEmailVerified =
        companyEmailVerifiedFilter === "All" ||
        (companyEmailVerifiedFilter === "Verified" && company.emailVerified) ||
        (companyEmailVerifiedFilter === "Unverified" && !company.emailVerified);

      // 5. Status Filter (Published/Draft/No Position)
      const matchesStatus =
        positionStatusFilter === "All" ||
        (positionStatusFilter === "Published" &&
          company.activePositions.some((pos) => pos.isPublished)) ||
        (positionStatusFilter === "Draft" &&
          company.activePositions.some((pos) => !pos.isPublished)) ||
        (positionStatusFilter === "No Position" &&
          company.activePositions.length === 0);

      // 6. Event Filter
      const matchesEvent =
        companyEventFilter === "All" ||
        company.eventIds.includes(companyEventFilter);

      // 7. Tester Filter
      const matchesTester = showInternalTesters || !company.isInternalTester;

      return (
        matchesCompanyName &&
        matchesHostName &&
        matchesPositionTitle &&
        matchesEmailVerified &&
        matchesStatus &&
        matchesEvent &&
        matchesTester
      );
    }),
  );

  let paginatedCompanies = $derived(
    filteredCompanies.slice(0, companyPage * pageSize),
  );

  // Reset pagination when filters change
  $effect(() => {
    void selectedTab;
    studentPage = 1;
    companyPage = 1;
  });

  $effect(() => {
    void lastNameFilter;
    void gradeFilter;
    void permissionSlipFilter;
    void lotteryStatusFilter;
    void studentEventFilter;
    studentPage = 1;
  });

  $effect(() => {
    void studentSortBy;
    void studentSortDir;
    studentPage = 1;
  });

  $effect(() => {
    void companyNameFilter;
    void hostNameFilter;
    void positionTitleFilter;
    void companyEmailVerifiedFilter;
    void positionStatusFilter;
    void companyEventFilter;
    companyPage = 1;
  });

  // Removed Host/Position specific effects as they are now merged with Company

  function toggleStudentExpansion(studentId: string) {
    if (expandedStudents.has(studentId)) {
      expandedStudents.delete(studentId);
    } else {
      expandedStudents.add(studentId);
    }
    expandedStudents = new Set(expandedStudents);
  }

  // Expanded companies will now track expanded positions within them
  function togglePositionExpansion(positionId: string) {
    if (expandedCompanies.has(positionId)) {
      expandedCompanies.delete(positionId);
    } else {
      expandedCompanies.add(positionId);
    }
    expandedCompanies = new Set(expandedCompanies);
  }

  function clearFilters() {
    showInternalTesters = false;
    if (selectedTab === "Student") {
      lastNameFilter = "";
      gradeFilter = "All";
      permissionSlipFilter = "All";
      lotteryStatusFilter = "All";
      emailVerifiedFilter = "All";
      studentEventFilter = data.activeEvent?.id || "All";
    } else if (selectedTab === "Company") {
      companyNameFilter = "";
      hostNameFilter = "";
      positionTitleFilter = "";
      companyEmailVerifiedFilter = "All";
      positionStatusFilter = "All";
      companyEventFilter = data.activeEvent?.id || "All";
    }
  }

  function formatDate(date: Date | string | null): string {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "Complete":
        return CheckCircle;
      case "Pending":
        return Clock;
      case "Not Started":
        return XCircle;
      case "Assigned":
        return Target;
      case "Unassigned":
        return Clock;
      case "No Picks":
        return AlertTriangle;
      default:
        return Clock;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "Complete":
      case "Assigned":
        return "text-green-600";
      case "Pending":
      case "Unassigned":
        return "text-yellow-600";
      case "Not Started":
      case "No Picks":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  }
</script>

<Navbar {isAdmin} {loggedIn} {isHost} {userRole} />

<div class="w-full mt-28 flex flex-col items-center">
  <div class="max-w-6xl w-full px-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Edit/Search Data</h1>
      <p class="text-gray-600">
        Manage student, company, host, and position data
      </p>
    </div>

    {#if !data.hasActiveEvent}
      <Card>
        <CardContent class="p-6 text-center">
          <AlertTriangle class="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 class="text-lg font-semibold mb-2">No Active Event</h3>
          <p class="text-gray-600">Please activate an event to manage data.</p>
        </CardContent>
      </Card>
    {:else}
      <!-- Navigation Tabs -->
      <div class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {selectedTab ===
              'Student'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              onclick={() => (selectedTab = "Student")}
            >
              Student
            </button>
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {selectedTab ===
              'Company'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              onclick={() => (selectedTab = "Company")}
            >
              Company
            </button>
          </nav>
        </div>
      </div>

      {#if selectedTab === "Student"}
        <!-- Student Management Section -->
        <div class="mb-6">
          <h2 class="text-2xl font-semibold mb-4">Student Management</h2>

          <!-- Filters -->
          <Card class="mb-4">
            <CardHeader>
              <CardTitle class="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <Label for="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    bind:value={lastNameFilter}
                    placeholder="Search by last name..."
                  />
                </div>

                <FilterSelect
                  label="Grade"
                  bind:value={gradeFilter}
                  placeholder="All Grades"
                  options={[
                    { value: "All", label: "All Grades" },
                    { value: "9", label: "Grade 9" },
                    { value: "10", label: "Grade 10" },
                    { value: "11", label: "Grade 11" },
                    { value: "12", label: "Grade 12" },
                  ]}
                />

                <FilterSelect
                  label="Permission Slip"
                  bind:value={permissionSlipFilter}
                  placeholder="All Status"
                  options={[
                    { value: "All", label: "All Status" },
                    { value: "Complete", label: "Complete" },
                    { value: "Pending", label: "Pending" },
                    { value: "Not Started", label: "Not Started" },
                  ]}
                />

                <FilterSelect
                  label="Lottery Status"
                  bind:value={lotteryStatusFilter}
                  placeholder="All Status"
                  options={[
                    { value: "All", label: "All Status" },
                    { value: "Assigned", label: "Assigned" },
                    { value: "Unassigned", label: "Unassigned" },
                    { value: "No Picks", label: "No Picks" },
                  ]}
                />

                <FilterSelect
                  label="Email Verified"
                  bind:value={emailVerifiedFilter}
                  placeholder="All"
                  options={[
                    { value: "All", label: "All" },
                    { value: "Verified", label: "Verified" },
                    { value: "Unverified", label: "Unverified" },
                  ]}
                />

                <FilterSelect
                  label="Event Participation"
                  bind:value={studentEventFilter}
                  placeholder="All Events"
                  options={eventOptions}
                />
              </div>

              <div class="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="showTestersStudent"
                  bind:checked={showInternalTesters}
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label
                  for="showTestersStudent"
                  class="text-sm font-medium text-gray-700"
                >
                  Show Internal Tester Accounts
                </Label>
              </div>

              <div class="flex gap-2">
                <Button variant="outline" onclick={clearFilters}>
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  onclick={() => {
                    const params = new URLSearchParams();
                    if (lastNameFilter) params.set("lastName", lastNameFilter);
                    if (gradeFilter !== "All") params.set("grade", gradeFilter);
                    if (permissionSlipFilter !== "All")
                      params.set("permissionSlip", permissionSlipFilter);
                    if (lotteryStatusFilter !== "All")
                      params.set("lotteryStatus", lotteryStatusFilter);
                    if (emailVerifiedFilter !== "All")
                      params.set("emailVerified", emailVerifiedFilter);
                    if (studentEventFilter !== "All")
                      params.set("eventId", studentEventFilter);
                    if (showInternalTesters) params.set("showTesters", "true");

                    window.location.href = `/dashboard/admin/data-mgmt/export?${params.toString()}`;
                  }}
                >
                  Export CSV
                </Button>
                {#if filteredStudents.length > 0 && canEdit}
                  <Button
                    onclick={() => (showMessengerDialog = true)}
                    class="bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare class="h-4 w-4 mr-2" />
                    Message Students ({filteredStudents.length})
                  </Button>
                {/if}
              </div>
            </CardContent>
          </Card>

          <!-- Sort and Student List -->
          <Card class="mb-4">
            <CardHeader>
              <CardTitle class="text-lg">Results</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex flex-wrap items-center gap-2">
                <Label for="studentSortBy" class="text-sm text-gray-600 whitespace-nowrap">
                  Sort by:
                </Label>
                <select
                  id="studentSortBy"
                  bind:value={studentSortBy}
                  class="h-8 rounded-md border border-gray-300 px-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="lastLogin">Last Login</option>
                  <option value="lastChoices">Last choices</option>
                  <option value="accountCreated">Account created</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => (studentSortDir = studentSortDir === 'desc' ? 'asc' : 'desc')}
                  title={studentSortDir === 'desc' ? 'Most recent first (click for oldest first)' : 'Oldest first (click for most recent first)'}
                >
                  {#if studentSortDir === 'desc'}
                    <ArrowDown class="h-4 w-4" />
                  {:else}
                    <ArrowUp class="h-4 w-4" />
                  {/if}
                </Button>
              </div>
              <p class="text-sm text-gray-600">
                Students ({filteredStudents.length})
              </p>
            </CardContent>
          </Card>

          <!-- Student List -->
          <div class="space-y-4">
            {#each paginatedStudents as student (student.id)}
              <Card class="hover:shadow-md transition-shadow">
                <CardContent class="p-6">
                  <!-- Student Header -->
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-4">
                      <div class="flex items-center space-x-2">
                        <User class="h-5 w-5 text-gray-500" />
                        <span class="font-semibold text-lg">
                          {student.firstName}
                          {student.lastName}
                        </span>
                        <Badge variant="outline">Grade {student.grade}</Badge>
                        {#if student.isInternalTester}
                          <Badge
                            variant="secondary"
                            class="bg-purple-100 text-purple-700 border-purple-200"
                            >INTERNAL TESTER</Badge
                          >
                        {/if}
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => toggleStudentExpansion(student.id)}
                      >
                        {#if expandedStudents.has(student.id)}
                          <ChevronUp class="h-4 w-4 mr-2" />
                          Hide Details
                        {:else}
                          <ChevronDown class="h-4 w-4 mr-2" />
                          View Details
                        {/if}
                      </Button>

                      {#if canEdit}
                        <StudentEditModal {student} />
                      {/if}
                    </div>
                  </div>

                  <!-- Contact Information -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div class="flex items-center space-x-2">
                      <Mail class="h-4 w-4 text-gray-500" />
                      <span class="text-sm">{student.email}</span>
                    </div>

                    <div class="flex items-center space-x-2">
                      <Phone class="h-4 w-4 text-gray-500" />
                      <span class="text-sm">{student.phone}</span>
                    </div>

                    <div class="flex items-center space-x-2">
                      <User class="h-4 w-4 text-gray-500" />
                      <span class="text-sm">{student.parentEmail}</span>
                    </div>
                  </div>

                  <!-- Status Information -->
                  <div class="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
                    {#each [{ status: student.permissionSlipStatus, label: "Permission Slip" }, { status: student.lotteryStatus, label: "Lottery" }] as statusInfo}
                      {@const Icon = getStatusIcon(statusInfo.status)}
                      <div class="flex items-center space-x-2">
                        <Icon
                          class="h-4 w-4 {getStatusColor(statusInfo.status)}"
                        />
                        <span
                          class="text-sm {getStatusColor(statusInfo.status)}"
                        >
                          {statusInfo.label}: {statusInfo.status}
                        </span>
                        {#if statusInfo.label === "Permission Slip" && statusInfo.status === "Pending" && student.permissionSlipCode}
                          <a
                            href="/permission-slip/{student.permissionSlipCode}"
                            target="_blank"
                            class="text-xs text-blue-600 underline ml-2 hover:text-blue-800"
                            onclick={(e) => e.stopPropagation()}
                          >
                            Copy Link
                          </a>
                        {/if}
                      </div>
                    {/each}

                    <div class="flex items-center space-x-2">
                      {#if student.emailVerified}
                        <CheckCircle class="h-4 w-4 text-green-600" />
                        <span class="text-sm text-green-600"
                          >Email Verified</span
                        >
                      {:else}
                        <XCircle class="h-4 w-4 text-red-600" />
                        <span class="text-sm text-red-600"
                          >Email Unverified</span
                        >
                      {/if}
                    </div>

                    <div class="flex flex-col gap-y-1">
                      <div class="flex items-center space-x-2">
                        <Calendar class="h-4 w-4 text-gray-500 shrink-0" />
                        <span class="text-sm text-gray-600">
                          Last Login: {formatDate(student.lastLogin)}
                        </span>
                      </div>
                      <div class="flex items-center space-x-2">
                        <Calendar class="h-4 w-4 text-gray-500 shrink-0" />
                        <span class="text-sm text-gray-600">
                          Last choices: {student.lastChoicesUpdate ? formatDate(student.lastChoicesUpdate) : 'None'}
                        </span>
                      </div>
                      <div class="flex items-center space-x-2">
                        <Calendar class="h-4 w-4 text-gray-500 shrink-0" />
                        <span class="text-sm text-gray-600">
                          Account created: {formatDate(student.accountCreated)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Expanded Details -->
                  {#if expandedStudents.has(student.id)}
                    <div class="border-t pt-4 space-y-4">
                      <!-- Student Preferences -->
                      <div>
                        <h4 class="font-semibold mb-2">
                          Student Preferences (Rank Ordered):
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                          <div class="space-y-2">
                            {#each student.studentPicks.slice(0, 5) as pick}
                              <div
                                class="flex items-center space-x-2 p-2 bg-gray-50 rounded"
                              >
                                <Badge variant="secondary">{pick.rank + 1}</Badge>
                                <span class="text-sm">
                                  {pick.companyName} - {pick.title}
                                </span>
                              </div>
                            {/each}
                          </div>
                          <div class="space-y-2">
                            {#each student.studentPicks.slice(5) as pick}
                              <div
                                class="flex items-center space-x-2 p-2 bg-gray-50 rounded"
                              >
                                <Badge variant="secondary">{pick.rank + 1}</Badge>
                                <span class="text-sm">
                                  {pick.companyName} - {pick.title}
                                </span>
                              </div>
                            {/each}
                          </div>
                        </div>
                      </div>

                      <!-- Lottery Assignment -->
                      {#if student.lotteryAssignment}
                        <div>
                          <h4 class="font-semibold mb-2">
                            Lottery Assignment:
                          </h4>
                          <div
                            class="flex items-center space-x-2 p-3 bg-green-50 rounded border border-green-200"
                          >
                            <Target class="h-5 w-5 text-green-600" />
                            <div>
                              <span class="font-medium">
                                {student.lotteryAssignment.companyName} - {student
                                  .lotteryAssignment.title}
                              </span>
                              <p class="text-sm text-gray-600">
                                Assigned: {formatDate(
                                  student.lotteryAssignment.assignedAt,
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </CardContent>
              </Card>
            {/each}

            {#if filteredStudents.length > paginatedStudents.length}
              <div class="flex justify-center pt-4 pb-8">
                <Button
                  variant="outline"
                  onclick={() => studentPage++}
                  class="w-full max-w-xs"
                >
                  Load More Students ({filteredStudents.length -
                    paginatedStudents.length} remaining)
                </Button>
              </div>
            {/if}
          </div>

          {#if filteredStudents.length === 0}
            <Card>
              <CardContent class="p-6 text-center">
                <User class="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">No Students Found</h3>
                <p class="text-gray-600 mb-4">
                  No students match your current filters.
                </p>
                <Button variant="outline" onclick={clearFilters}>
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          {/if}
        </div>
      {/if}

      {#if selectedTab === "Company"}
        <!-- Consolidated Company Management Section -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-semibold">Company Management</h2>
          </div>

          <!-- Filters -->
          <Card class="mb-4">
            <CardHeader>
              <CardTitle class="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <Label for="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    bind:value={companyNameFilter}
                    placeholder="Search by company..."
                  />
                </div>

                <div>
                  <Label for="hostName">Host Name</Label>
                  <Input
                    id="hostName"
                    bind:value={hostNameFilter}
                    placeholder="Search by host..."
                  />
                </div>

                <div>
                  <Label for="positionTitle">Position Title</Label>
                  <Input
                    id="positionTitle"
                    bind:value={positionTitleFilter}
                    placeholder="Search by title..."
                  />
                </div>

                <FilterSelect
                  label="Email Verified"
                  bind:value={companyEmailVerifiedFilter}
                  placeholder="All"
                  options={[
                    { value: "All", label: "All" },
                    { value: "Verified", label: "Verified" },
                    { value: "Unverified", label: "Unverified" },
                  ]}
                />

                <FilterSelect
                  label="Status"
                  bind:value={positionStatusFilter}
                  placeholder="All Status"
                  options={[
                    { value: "All", label: "All Status" },
                    { value: "Published", label: "Published" },
                    { value: "Draft", label: "Draft" },
                    { value: "No Position", label: "No Position" },
                  ]}
                />
              </div>

              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showTestersCompany"
                    bind:checked={showInternalTesters}
                    class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label
                    for="showTestersCompany"
                    class="text-sm font-medium text-gray-700"
                  >
                    Show Internal Tester Accounts
                  </Label>
                </div>

                <div class="flex items-center space-x-2">
                  <Label for="companyEventFilter" class="mr-2"
                    >Event Participation:</Label
                  >
                  <div class="w-64">
                    <FilterSelect
                      label=""
                      bind:value={companyEventFilter}
                      placeholder="All Events"
                      options={eventOptions}
                    />
                  </div>
                </div>
              </div>

              <div class="flex gap-2">
                <Button variant="outline" onclick={clearFilters}>
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  onclick={() => {
                    const params = new URLSearchParams();
                    params.set("type", "companies");
                    if (companyNameFilter)
                      params.set("companyName", companyNameFilter);
                    if (companyEmailVerifiedFilter !== "All")
                      params.set("emailVerified", companyEmailVerifiedFilter);
                    if (companyEventFilter !== "All")
                      params.set("eventId", companyEventFilter);
                    if (positionStatusFilter !== "All")
                      params.set("positionStatus", positionStatusFilter);
                    if (showInternalTesters) params.set("showTesters", "true");

                    window.location.href = `/dashboard/admin/data-mgmt/export?${params.toString()}`;
                  }}
                >
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onclick={() => window.location.reload()}
                >
                  Refresh
                </Button>
                {#if filteredCompanies.length > 0 && canEdit}
                  <Button
                    onclick={() => (showCompanyMessengerDialog = true)}
                    class="bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare class="h-4 w-4 mr-2" />
                    Message Companies ({filteredCompanies.length})
                  </Button>
                {/if}
              </div>
            </CardContent>
          </Card>

          <!-- Results Summary -->
          <div class="mb-4">
            <p class="text-sm text-gray-600">
              Results: {filteredCompanies.length} companies found
            </p>
          </div>

          <!-- Company List -->
          <div class="space-y-6">
            {#each paginatedCompanies as company (company.id)}
              <Card class="hover:shadow-lg transition-shadow border-2">
                <CardContent class="p-0">
                  <!-- TOP SECTION: Company & Account Owner Info -->
                  <div class="p-6 bg-gray-50/50">
                    <div class="flex items-start justify-between mb-4">
                      <div class="flex flex-col space-y-2">
                        <div class="flex items-center space-x-3">
                          <h3 class="text-2xl font-bold text-gray-900">
                            {company.companyName}
                          </h3>
                          <Badge
                            variant="secondary"
                            class="bg-blue-100 text-blue-800 border-blue-200"
                          >
                            {company.activePositionCount} Published Position{company.activePositionCount !==
                            1
                              ? "s"
                              : ""}
                          </Badge>
                          {#if company.isInternalTester}
                            <Badge
                              variant="secondary"
                              class="bg-purple-100 text-purple-700 border-purple-200"
                              >INTERNAL TESTER</Badge
                            >
                          {/if}
                        </div>

                        <!-- Account Owner Info -->
                        <div class="flex flex-col space-y-1">
                          {#each company.hosts as host}
                            <div class="flex flex-col">
                              <div class="flex items-center space-x-3">
                                <span class="text-gray-700 font-medium"
                                  >{host.name}</span
                                >
                                <span class="text-gray-500 text-sm"
                                  >({host.email})</span
                                >
                                {#if host.emailVerified}
                                  <Badge
                                    variant="default"
                                    class="bg-green-100 text-green-700 border-green-200 h-5 px-2 text-[10px]"
                                    >VERIFIED</Badge
                                  >
                                {:else}
                                  <Badge
                                    variant="default"
                                    class="bg-red-100 text-red-700 border-red-200 h-5 px-2 text-[10px]"
                                    >UNVERIFIED</Badge
                                  >
                                {/if}
                                {#if canEdit}
                                  <HostEditModal {host} />
                                {/if}
                              </div>
                              <div class="text-xs text-gray-400 mt-0.5">
                                Last Login: {formatDate(host.lastLogin)}
                              </div>
                            </div>
                          {/each}
                        </div>
                      </div>

                      {#if canEdit}
                        <div class="flex gap-2">
                          <CreatePositionModal
                            careers={data.careers}
                            targetHostId={company.hosts[0]?.id}
                            targetCompanyName={company.companyName}
                          />
                          <CompanyEditModal {company} />
                        </div>
                      {/if}
                    </div>

                    <!-- Company Details -->
                    <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
                      <div class="flex flex-col space-y-2">
                        <p class="text-gray-600 italic">
                          {company.companyDescription}
                        </p>
                        {#if company.companyUrl}
                          <a
                            href={company.companyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-sm text-blue-600 hover:underline flex items-center"
                          >
                            <Target class="h-4 w-4 mr-1" />
                            {company.companyUrl}
                          </a>
                        {/if}
                      </div>
                    </div>
                  </div>

                  <!-- BOTTOM SECTION: Positions -->
                  <div class="border-t">
                    <div class="p-4 bg-gray-100/30">
                      <h4
                        class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4"
                      >
                        Positions for this Event
                      </h4>

                      {#if company.activePositions && company.activePositions.length > 0}
                        <div class="space-y-3">
                          {#each company.activePositions as position}
                            <Card class="bg-white border shadow-sm">
                              <CardContent class="p-4">
                                <div class="flex items-center justify-between">
                                  <div class="flex items-center space-x-4">
                                    <div class="flex flex-col">
                                      <div class="flex items-center space-x-2">
                                        <span class="font-bold text-gray-900"
                                          >{position.title}</span
                                        >
                                        <Badge
                                          variant="outline"
                                          class="bg-gray-50 font-bold"
                                        >
                                          {position.slots} Slot{position.slots !==
                                          1
                                            ? "s"
                                            : ""}
                                        </Badge>
                                      </div>
                                      <div
                                        class="flex items-center space-x-2 mt-1"
                                      >
                                        <span
                                          class="text-xs text-gray-500 font-medium"
                                          >{position.career}</span
                                        >
                                        <span class="text-gray-300">•</span>
                                        {#if position.isPublished}
                                          <Badge
                                            variant="default"
                                            class="bg-green-600 h-5 px-2 text-[10px]"
                                            >Published</Badge
                                          >
                                        {:else}
                                          <Badge
                                            variant="secondary"
                                            class="h-5 px-2 text-[10px]"
                                            >Draft</Badge
                                          >
                                        {/if}
                                        {#if position.isInternalTester}
                                          <Badge
                                            variant="secondary"
                                            class="text-[10px] px-1 h-4 bg-purple-100 text-purple-700"
                                            >TESTER</Badge
                                          >
                                        {/if}
                                      </div>
                                    </div>
                                  </div>

                                  <div class="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onclick={() =>
                                        togglePositionExpansion(position.id)}
                                      class="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      {#if expandedCompanies.has(position.id)}
                                        <ChevronUp class="h-4 w-4 mr-2" />
                                        Hide Details
                                      {:else}
                                        <ChevronDown class="h-4 w-4 mr-2" />
                                        View Details
                                      {/if}
                                    </Button>

                                    {#if canEdit}
                                      <PositionEditModal
                                        {position}
                                        careers={data.careers}
                                      />
                                    {/if}
                                  </div>
                                </div>

                                <!-- Position Expansion Details -->
                                {#if expandedCompanies.has(position.id)}
                                  <div
                                    class="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8"
                                  >
                                    <div class="space-y-1">
                                      <span
                                        class="text-xs font-bold text-gray-400 uppercase tracking-tight"
                                        >Summary</span
                                      >
                                      <p class="text-sm text-gray-700">
                                        {position.summary}
                                      </p>
                                    </div>
                                    <div class="space-y-1">
                                      <span
                                        class="text-xs font-bold text-gray-400 uppercase tracking-tight"
                                        >Contact Information</span
                                      >
                                      <p class="text-sm text-gray-700">
                                        {position.contactName}
                                      </p>
                                      <p class="text-sm text-gray-500">
                                        {position.contactEmail}
                                      </p>
                                    </div>
                                    <div class="space-y-1">
                                      <span
                                        class="text-xs font-bold text-gray-400 uppercase tracking-tight"
                                        >Logistics</span
                                      >
                                      <div
                                        class="flex items-center space-x-2 text-sm text-gray-700"
                                      >
                                        <Clock class="h-3 w-3" />
                                        <span
                                          >{position.arrival} arrival • {position.start}
                                          - {position.end}</span
                                        >
                                      </div>
                                      <div
                                        class="flex items-start space-x-2 text-sm text-gray-700 mt-1"
                                      >
                                        <Target class="h-3 w-3 mt-1" />
                                        <span>{position.address}</span>
                                      </div>
                                    </div>
                                    <div class="space-y-1">
                                      <span
                                        class="text-xs font-bold text-gray-400 uppercase tracking-tight"
                                        >Requirements</span
                                      >
                                      <p class="text-sm text-gray-700">
                                        <span class="font-medium">Attire:</span>
                                        {position.attire || "None specified"}
                                      </p>
                                      <p class="text-sm text-gray-700 mt-1">
                                        <span class="font-medium"
                                          >Instructions:</span
                                        >
                                        {position.instructions || "None"}
                                      </p>
                                    </div>
                                    {#if position.attachments && position.attachments.length > 0}
                                      <div class="space-y-1">
                                        <span
                                          class="text-xs font-bold text-gray-400 uppercase tracking-tight"
                                          >Attachments</span
                                        >
                                        <div class="flex flex-col gap-1">
                                          {#each position.attachments as attachment}
                                            <div
                                              class="text-sm text-gray-700 flex items-center gap-2"
                                            >
                                              <span
                                                class="w-1.5 h-1.5 rounded-full bg-gray-400"
                                              ></span>
                                              {attachment.fileName}
                                            </div>
                                          {/each}
                                        </div>
                                      </div>
                                    {/if}
                                    <div class="md:col-span-2 pt-2">
                                      <span class="text-[10px] text-gray-400"
                                        >{position.isPublished
                                          ? "Published"
                                          : "Created"}: {formatDate(
                                          position.publishedAt ||
                                            position.createdAt,
                                        )}</span
                                      >
                                    </div>
                                  </div>
                                {/if}
                              </CardContent>
                            </Card>
                          {/each}
                        </div>
                      {:else}
                        <div
                          class="text-center py-6 bg-white border rounded-md"
                        >
                          <Briefcase
                            class="h-8 w-8 text-gray-300 mx-auto mb-2"
                          />
                          <p class="text-sm text-gray-500 font-medium">
                            No positions listed for the current event
                          </p>
                        </div>
                      {/if}
                    </div>
                  </div>
                </CardContent>
              </Card>
            {/each}

            {#if filteredCompanies.length > paginatedCompanies.length}
              <div class="flex justify-center pt-4 pb-8">
                <Button
                  variant="outline"
                  onclick={() => companyPage++}
                  class="w-full max-w-xs"
                >
                  Load More Companies ({filteredCompanies.length -
                    paginatedCompanies.length} remaining)
                </Button>
              </div>
            {/if}
          </div>

          {#if filteredCompanies.length === 0}
            <Card>
              <CardContent class="p-6 text-center">
                <User class="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">No Companies Found</h3>
                <p class="text-gray-600 mb-4">
                  No companies match your current filters.
                </p>
                <Button variant="outline" onclick={clearFilters}>
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          {/if}
        </div>
      {/if}
    {/if}

    <!-- Message Students Dialog -->
    <Dialog.Root bind:open={showMessengerDialog}>
      <Dialog.Content class="max-w-2xl max-h-[80vh] overflow-y-auto">
        <Dialog.Header>
          <Dialog.Title class="flex items-center gap-2">
            <MessageSquare class="h-5 w-5" />
            Message Filtered Students
          </Dialog.Title>
          <Dialog.Description>
            Send emails or SMS messages to the {filteredStudents.length} student{filteredStudents.length !==
            1
              ? "s"
              : ""} in your current search results.
          </Dialog.Description>
        </Dialog.Header>
        <div class="py-4">
          <FilteredStudentMessenger
            studentIds={filteredStudents.map((s) => s.id)}
            studentCount={filteredStudents.length}
          />
        </div>
      </Dialog.Content>
    </Dialog.Root>

    <!-- Message Companies Dialog -->
    <Dialog.Root bind:open={showCompanyMessengerDialog}>
      <Dialog.Content class="max-w-2xl max-h-[80vh] overflow-y-auto">
        <Dialog.Header>
          <Dialog.Title class="flex items-center gap-2">
            <MessageSquare class="h-5 w-5" />
            Message Filtered Companies
          </Dialog.Title>
          <Dialog.Description>
            Send emails to all host and position contacts for the {filteredCompanies.length}
            company{filteredCompanies.length !== 1 ? "ies" : ""} in your current
            search results.
          </Dialog.Description>
        </Dialog.Header>
        <div class="py-4">
          <FilteredCompanyMessenger
            companyIds={filteredCompanies.map((c) => c.id)}
            companyCount={filteredCompanies.length}
          />
        </div>
      </Dialog.Content>
    </Dialog.Root>
  </div>
</div>

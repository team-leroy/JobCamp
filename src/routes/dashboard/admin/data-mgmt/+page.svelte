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
  import { MessageSquare } from "lucide-svelte";
  import * as Dialog from "$lib/components/ui/dialog";

  interface Student {
    id: string;
    firstName: string;
    lastName: string;
    grade: number;
    phone: string;
    email: string;
    parentEmail: string;
    permissionSlipStatus: string;
    permissionSlipDate: Date | null;
    lastLogin: Date | null;
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
    isInternalTester: boolean;
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
    lastLogin: Date | null;
    isInternalTester: boolean;
    companyName: string;
    eventIds: string[];
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
    createdAt: Date;
    hostName: string;
    companyName: string;
    isPublished: boolean;
    isInternalTester: boolean;
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
      label:
        event.name || `Event ${new Date(event.date).toLocaleDateString()}`,
    })),
  ]);

  // Filter states for Student
  let lastNameFilter = $state("");
  let gradeFilter = $state("All");
  let permissionSlipFilter = $state("All");
  let lotteryStatusFilter = $state("All");
  let studentEventFilter = $state(data.activeEvent?.id || "All");

  // Filter states for Company
  let companyNameFilter = $state("");
  let companyEventFilter = $state(data.activeEvent?.id || "All");

  // Filter states for Host
  let hostNameFilter = $state("");
  let hostEventFilter = $state(data.activeEvent?.id || "All");

  // Filter states for Position
  let positionTitleFilter = $state("");
  let positionCareerFilter = $state("All");
  let positionEventFilter = $state(data.activeEvent?.id || "All");
  let positionStatusFilter = $state("Published");

  // Global Filter for Internal Testers
  let showInternalTesters = $state(false);

  // UI states
  let expandedStudents = $state(new Set<string>());
  let expandedCompanies = $state(new Set<string>());
  let expandedPositions = $state(new Set<string>());
  let selectedTab = $state("Student");
  let showMessengerDialog = $state(false);

  // Pagination states
  let studentPage = $state(1);
  let companyPage = $state(1);
  let hostPage = $state(1);
  let positionPage = $state(1);
  const pageSize = 50;

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

      const matchesEvent =
        studentEventFilter === "All" ||
        student.eventIds.includes(studentEventFilter);

      const matchesTester = showInternalTesters || !student.isInternalTester;

      return (
        matchesLastName &&
        matchesGrade &&
        matchesPermissionSlip &&
        matchesLotteryStatus &&
        matchesEvent &&
        matchesTester
      );
    })
  );

  let paginatedStudents = $derived(
    filteredStudents.slice(0, studentPage * pageSize)
  );

  // Computed filtered companies
  let filteredCompanies = $derived(
    data.companies.filter((company) => {
      const matchesCompanyName =
        !companyNameFilter ||
        company.companyName
          .toLowerCase()
          .includes(companyNameFilter.toLowerCase());

      const matchesEvent =
        companyEventFilter === "All" ||
        company.eventIds.includes(companyEventFilter);

      const matchesTester = showInternalTesters || !company.isInternalTester;

      return matchesCompanyName && matchesEvent && matchesTester;
    })
  );

  let paginatedCompanies = $derived(
    filteredCompanies.slice(0, companyPage * pageSize)
  );

  // Computed filtered hosts
  let filteredHosts = $derived(
    data.hosts.filter((host) => {
      const matchesHostName =
        !hostNameFilter ||
        host.name.toLowerCase().includes(hostNameFilter.toLowerCase());

      const matchesEvent =
        hostEventFilter === "All" ||
        host.eventIds.includes(hostEventFilter);

      const matchesTester = showInternalTesters || !host.isInternalTester;

      return matchesHostName && matchesEvent && matchesTester;
    })
  );

  let paginatedHosts = $derived(filteredHosts.slice(0, hostPage * pageSize));

  // Computed filtered positions
  let filteredPositions = $derived(
    data.positions.filter((position) => {
      const matchesTitle =
        !positionTitleFilter ||
        position.title
          .toLowerCase()
          .includes(positionTitleFilter.toLowerCase());

      const matchesCareer =
        positionCareerFilter === "All" ||
        position.career === positionCareerFilter;

      const matchesEvent =
        positionEventFilter === "All" ||
        position.eventId === positionEventFilter;

      const matchesStatus =
        positionStatusFilter === "All" ||
        (positionStatusFilter === "Published" && position.isPublished) ||
        (positionStatusFilter === "Draft" && !position.isPublished);

      const matchesTester = showInternalTesters || !position.isInternalTester;

      return (
        matchesTitle &&
        matchesCareer &&
        matchesEvent &&
        matchesStatus &&
        matchesTester
      );
    })
  );

  let paginatedPositions = $derived(
    filteredPositions.slice(0, positionPage * pageSize)
  );

  // Reset pagination when filters change
  $effect(() => {
    void selectedTab;
    studentPage = 1;
    companyPage = 1;
    hostPage = 1;
    positionPage = 1;
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
    void companyNameFilter;
    void companyEventFilter;
    companyPage = 1;
  });

  $effect(() => {
    void hostNameFilter;
    void hostEventFilter;
    hostPage = 1;
  });

  $effect(() => {
    void positionTitleFilter;
    void positionCareerFilter;
    void positionEventFilter;
    void positionStatusFilter;
    positionPage = 1;
  });

  function toggleStudentExpansion(studentId: string) {
    if (expandedStudents.has(studentId)) {
      expandedStudents.delete(studentId);
    } else {
      expandedStudents.add(studentId);
    }
    expandedStudents = new Set(expandedStudents);
  }

  function toggleCompanyExpansion(companyId: string) {
    if (expandedCompanies.has(companyId)) {
      expandedCompanies.delete(companyId);
    } else {
      expandedCompanies.add(companyId);
    }
    expandedCompanies = new Set(expandedCompanies);
  }

  function togglePositionExpansion(positionId: string) {
    if (expandedPositions.has(positionId)) {
      expandedPositions.delete(positionId);
    } else {
      expandedPositions.add(positionId);
    }
    expandedPositions = new Set(expandedPositions);
  }

  function clearFilters() {
    showInternalTesters = false;
    if (selectedTab === "Student") {
      lastNameFilter = "";
      gradeFilter = "All";
      permissionSlipFilter = "All";
      lotteryStatusFilter = "All";
      studentEventFilter = data.activeEvent?.id || "All";
    } else if (selectedTab === "Company") {
      companyNameFilter = "";
      companyEventFilter = data.activeEvent?.id || "All";
    } else if (selectedTab === "Host") {
      hostNameFilter = "";
      hostEventFilter = data.activeEvent?.id || "All";
    } else if (selectedTab === "Position") {
      positionTitleFilter = "";
      positionCareerFilter = "All";
      positionEventFilter = data.activeEvent?.id || "All";
      positionStatusFilter = "Published";
    }
  }

  function formatDate(date: Date | null): string {
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
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {selectedTab ===
              'Host'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              onclick={() => (selectedTab = "Host")}
            >
              Host
            </button>
            <button
              class="py-2 px-1 border-b-2 font-medium text-sm {selectedTab ===
              'Position'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              onclick={() => (selectedTab = "Position")}
            >
              Position
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
              <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
                <Label for="showTestersStudent" class="text-sm font-medium text-gray-700">
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
                    if (studentEventFilter !== "All")
                      params.set("eventId", studentEventFilter);
                    if (showInternalTesters)
                      params.set("showTesters", "true");

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

          <!-- Student List -->
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">
                Students ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                <Button
                  variant="outline"
                  onclick={() => window.location.reload()}
                >
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Results Summary -->
          <div class="mb-4">
            <p class="text-sm text-gray-600">
              Results: {filteredStudents.length} students found
            </p>
          </div>

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
                          <Badge variant="secondary" class="bg-purple-100 text-purple-700 border-purple-200">INTERNAL TESTER</Badge>
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
                  <div class="flex items-center space-x-6 mb-4">
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
                      </div>
                    {/each}

                    <div class="flex items-center space-x-2">
                      <Calendar class="h-4 w-4 text-gray-500" />
                      <span class="text-sm text-gray-600">
                        Last Login: {formatDate(student.lastLogin)}
                      </span>
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
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {#each student.studentPicks as pick}
                            <div
                              class="flex items-center space-x-2 p-2 bg-gray-50 rounded"
                            >
                              <Badge variant="secondary">{pick.rank}</Badge>
                              <span class="text-sm">
                                {pick.companyName} - {pick.title}
                              </span>
                            </div>
                          {/each}
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
                                  student.lotteryAssignment.assignedAt
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
        <!-- Company Management Section -->
        <div class="mb-6">
          <h2 class="text-2xl font-semibold mb-4">Company Management</h2>

          <!-- Filters -->
          <Card class="mb-4">
            <CardHeader>
              <CardTitle class="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label for="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    bind:value={companyNameFilter}
                    placeholder="Search by company name..."
                  />
                </div>

                <FilterSelect
                  label="Event Participation"
                  bind:value={companyEventFilter}
                  placeholder="All Events"
                  options={eventOptions}
                />
              </div>

              <div class="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="showTestersCompany"
                  bind:checked={showInternalTesters}
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label for="showTestersCompany" class="text-sm font-medium text-gray-700">
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
                    params.set("type", "companies");
                    if (companyNameFilter) params.set("companyName", companyNameFilter);
                    if (companyEventFilter !== "All") params.set("eventId", companyEventFilter);
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
          <div class="space-y-4">
            {#each paginatedCompanies as company (company.id)}
              <Card class="hover:shadow-md transition-shadow">
                <CardContent class="p-6">
                  <!-- Company Header -->
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-4">
                      <div class="flex items-center space-x-2">
                        <User class="h-5 w-5 text-gray-500" />
                        <span class="font-semibold text-lg">
                          {company.companyName}
                        </span>
                        {#if company.isInternalTester}
                          <Badge variant="secondary" class="bg-purple-100 text-purple-700 border-purple-200">INTERNAL TESTER</Badge>
                        {/if}
                        <Badge variant="outline">
                          {company.activePositionCount} Position{company.activePositionCount !==
                          1
                            ? "s"
                            : ""}
                        </Badge>
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => toggleCompanyExpansion(company.id)}
                      >
                        {#if expandedCompanies.has(company.id)}
                          <ChevronUp class="h-4 w-4 mr-2" />
                          Hide Details
                        {:else}
                          <ChevronDown class="h-4 w-4 mr-2" />
                          View Details
                        {/if}
                      </Button>

                      {#if canEdit}
                        <CompanyEditModal {company} />
                      {/if}
                    </div>
                  </div>

                  <!-- Company Information -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="flex items-start space-x-2">
                      <User class="h-4 w-4 text-gray-500 mt-1" />
                      <div>
                        <span class="text-sm font-medium">Description:</span>
                        <p class="text-sm text-gray-600">
                          {company.companyDescription}
                        </p>
                      </div>
                    </div>

                    {#if company.companyUrl}
                      <div class="flex items-center space-x-2">
                        <Mail class="h-4 w-4 text-gray-500" />
                        <a
                          href={company.companyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-sm text-blue-600 hover:underline"
                        >
                          {company.companyUrl}
                        </a>
                      </div>
                    {/if}
                  </div>

                  <!-- Expanded Details -->
                  {#if expandedCompanies.has(company.id)}
                    <div class="border-t pt-4 space-y-4">
                      <div>
                        <h4 class="font-semibold mb-2">
                          Additional Information
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span class="text-sm font-medium"
                              >Active Positions:</span
                            >
                            <p class="text-sm text-gray-600">
                              {company.activePositionCount} position{company.activePositionCount !== 1 ? "s" : ""}
                              ({company.activeSlotsCount} slot{company.activeSlotsCount !== 1 ? "s" : ""})
                              in the current event
                            </p>
                          </div>
                        </div>

                        {#if company.activePositions && company.activePositions.length > 0}
                          <div class="mt-4">
                            <h5 class="text-sm font-semibold mb-2">Positions in Current Event:</h5>
                            <div class="space-y-2">
                              {#each company.activePositions as position}
                                <div class="flex items-center justify-between p-2 bg-gray-50 rounded-md border text-sm">
                                  <div class="flex flex-col">
                                    <span class="font-medium">{position.title}</span>
                                    <span class="text-xs text-gray-500">{position.career} • {position.slots} slots</span>
                                  </div>
                                  <div class="flex items-center gap-2">
                                    {#if position.isInternalTester}
                                      <Badge variant="secondary" class="text-[10px] px-1 h-4 bg-purple-100 text-purple-700">TESTER</Badge>
                                    {/if}
                                    {#if position.isPublished}
                                      <Badge variant="default" class="text-[10px] px-1 h-4">Published</Badge>
                                    {:else}
                                      <Badge variant="secondary" class="text-[10px] px-1 h-4">Draft</Badge>
                                    {/if}
                                    {#if canEdit}
                                      <PositionEditModal {position} careers={data.careers} />
                                    {/if}
                                  </div>
                                </div>
                              {/each}
                            </div>
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/if}
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

      {#if selectedTab === "Host"}
        <!-- Host Management Section -->
        <div class="mb-6">
          <h2 class="text-2xl font-semibold mb-4">Host Management</h2>

          <!-- Filters -->
          <Card class="mb-4">
            <CardHeader>
              <CardTitle class="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label for="hostName">Host Name</Label>
                  <Input
                    id="hostName"
                    bind:value={hostNameFilter}
                    placeholder="Search by host name..."
                  />
                </div>

                <FilterSelect
                  label="Event Participation"
                  bind:value={hostEventFilter}
                  placeholder="All Events"
                  options={eventOptions}
                />
              </div>

              <div class="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="showTestersHost"
                  bind:checked={showInternalTesters}
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label for="showTestersHost" class="text-sm font-medium text-gray-700">
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
                    params.set("type", "hosts");
                    if (hostNameFilter) params.set("hostName", hostNameFilter);
                    if (hostEventFilter !== "All") params.set("eventId", hostEventFilter);
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
              </div>
            </CardContent>
          </Card>

          <!-- Results Summary -->
          <div class="mb-4">
            <p class="text-sm text-gray-600">
              Results: {filteredHosts.length} hosts found
            </p>
          </div>

          <!-- Host List -->
          <div class="space-y-4">
            {#each paginatedHosts as host (host.id)}
              <Card class="hover:shadow-md transition-shadow">
                <CardContent class="p-6">
                  <!-- Host Header -->
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-4">
                      <div class="flex items-center space-x-2">
                        <User class="h-5 w-5 text-gray-500" />
                        <span class="font-semibold text-lg">
                          {host.name}
                        </span>
                        <Badge variant="outline">{host.companyName}</Badge>
                        {#if host.isInternalTester}
                          <Badge variant="secondary" class="bg-purple-100 text-purple-700 border-purple-200">INTERNAL TESTER</Badge>
                        {/if}
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      {#if canEdit}
                        <HostEditModal {host} />
                      {/if}
                    </div>
                  </div>

                  <!-- Host Information -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="flex items-center space-x-2">
                      <Mail class="h-4 w-4 text-gray-500" />
                      <span class="text-sm">{host.email}</span>
                    </div>

                    <div class="flex items-center space-x-2">
                      <Calendar class="h-4 w-4 text-gray-500" />
                      <span class="text-sm text-gray-600">
                        Last Login: {formatDate(host.lastLogin)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            {/each}

            {#if filteredHosts.length > paginatedHosts.length}
              <div class="flex justify-center pt-4 pb-8">
                <Button
                  variant="outline"
                  onclick={() => hostPage++}
                  class="w-full max-w-xs"
                >
                  Load More Hosts ({filteredHosts.length -
                    paginatedHosts.length} remaining)
                </Button>
              </div>
            {/if}
          </div>

          {#if filteredHosts.length === 0}
            <Card>
              <CardContent class="p-6 text-center">
                <User class="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">No Hosts Found</h3>
                <p class="text-gray-600 mb-4">
                  No hosts match your current filters.
                </p>
                <Button variant="outline" onclick={clearFilters}>
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          {/if}
        </div>
      {/if}

      {#if selectedTab === "Position"}
        <!-- Position Management Section -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-semibold">Position Management</h2>
            {#if canEdit}
              <CreatePositionModal careers={data.careers} />
            {/if}
          </div>

          <!-- Filters -->
          <Card class="mb-4">
            <CardHeader>
              <CardTitle class="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label for="positionTitle">Position Title</Label>
                  <Input
                    id="positionTitle"
                    bind:value={positionTitleFilter}
                    placeholder="Search by title..."
                  />
                </div>

                <FilterSelect
                  label="Career"
                  bind:value={positionCareerFilter}
                  placeholder="All Careers"
                  options={[
                    { value: "All", label: "All Careers" },
                    ...data.careers.map((career) => ({
                      value: career,
                      label: career,
                    })),
                  ]}
                />

                <FilterSelect
                  label="Event Participation"
                  bind:value={positionEventFilter}
                  placeholder="All Events"
                  options={eventOptions}
                />

                <FilterSelect
                  label="Status"
                  bind:value={positionStatusFilter}
                  placeholder="All Status"
                  options={[
                    { value: "All", label: "All Status" },
                    { value: "Published", label: "Published" },
                    { value: "Draft", label: "Draft" },
                  ]}
                />
              </div>

              <div class="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="showTestersPosition"
                  bind:checked={showInternalTesters}
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label for="showTestersPosition" class="text-sm font-medium text-gray-700">
                  Show Internal Tester Accounts
                </Label>
              </div>
              
              <div class="flex gap-2">
                <Button variant="outline" onclick={clearFilters}>
                  Clear All Filters
                </Button>
                <Button
                  variant="outline"
                  onclick={() => {
                    const params = new URLSearchParams();
                    params.set("type", "positions");
                    if (positionTitleFilter) params.set("positionTitle", positionTitleFilter);
                    if (positionCareerFilter !== "All") params.set("positionCareer", positionCareerFilter);
                    if (positionEventFilter !== "All") params.set("eventId", positionEventFilter);
                    if (positionStatusFilter !== "All") params.set("positionStatus", positionStatusFilter);
                    if (showInternalTesters) params.set("showTesters", "true");

                    window.location.href = `/dashboard/admin/data-mgmt/export?${params.toString()}`;
                  }}
                >
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <!-- Position List -->
          <div class="space-y-4">
            {#each paginatedPositions as position (position.id)}
              <Card>
                <CardContent class="p-4">
                  <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-2">
                        <h3 class="text-lg font-semibold">{position.title}</h3>
                        <Badge variant="outline">{position.career}</Badge>
                        {#if position.isInternalTester}
                          <Badge variant="secondary" class="bg-purple-100 text-purple-700 border-purple-200">INTERNAL TESTER</Badge>
                        {/if}
                        {#if position.isPublished}
                          <Badge variant="default">Published</Badge>
                        {:else}
                          <Badge variant="secondary">Draft</Badge>
                        {/if}
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="flex items-center space-x-2">
                          <User class="h-4 w-4 text-gray-500" />
                          <span class="text-sm">{position.contactName}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                          <Badge variant="outline"
                            >{position.slots} slot{position.slots !== 1
                              ? "s"
                              : ""}</Badge
                          >
                        </div>
                        <div class="flex items-center space-x-2">
                          <span class="text-sm text-gray-600"
                            >{position.companyName}</span
                          >
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => togglePositionExpansion(position.id)}
                      >
                        {#if expandedPositions.has(position.id)}
                          <ChevronUp class="h-4 w-4 mr-2" />
                          Hide Details
                        {:else}
                          <ChevronDown class="h-4 w-4 mr-2" />
                          View Details
                        {/if}
                      </Button>

                      {#if canEdit}
                        <PositionEditModal {position} careers={data.careers} />
                      {/if}
                    </div>
                  </div>

                  <!-- Expanded Details -->
                  {#if expandedPositions.has(position.id)}
                    <div class="border-t pt-4 space-y-4">
                      <div>
                        <h4 class="font-semibold mb-2">
                          Additional Information
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span class="text-sm font-medium">Summary:</span>
                            <p class="text-sm text-gray-600">
                              {position.summary}
                            </p>
                          </div>
                          <div>
                            <span class="text-sm font-medium"
                              >Contact Email:</span
                            >
                            <p class="text-sm text-gray-600">
                              {position.contactEmail}
                            </p>
                          </div>
                          <div>
                            <span class="text-sm font-medium">Address:</span>
                            <p class="text-sm text-gray-600">
                              {position.address}
                            </p>
                          </div>
                          <div>
                            <span class="text-sm font-medium"
                              >Instructions:</span
                            >
                            <p class="text-sm text-gray-600">
                              {position.instructions || "None"}
                            </p>
                          </div>
                          <div>
                            <span class="text-sm font-medium">Attire:</span>
                            <p class="text-sm text-gray-600">
                              {position.attire || "None"}
                            </p>
                          </div>
                          <div>
                            <span class="text-sm font-medium">Host Name:</span>
                            <p class="text-sm text-gray-600">
                              {position.hostName}
                            </p>
                          </div>
                          <div>
                            <span class="text-sm font-medium"
                              >Arrival Time:</span
                            >
                            <p class="text-sm text-gray-600">
                              {position.arrival}
                            </p>
                          </div>
                          <div>
                            <span class="text-sm font-medium">Start Time:</span>
                            <p class="text-sm text-gray-600">
                              {position.start}
                            </p>
                          </div>
                          <div>
                            <span class="text-sm font-medium">End Time:</span>
                            <p class="text-sm text-gray-600">{position.end}</p>
                          </div>
                          <div>
                            <span class="text-sm font-medium">Created At:</span>
                            <p class="text-sm text-gray-600">
                              {formatDate(position.createdAt)}
                            </p>
                          </div>
                          </div>
                        </div>
                      </div>
                    {/if}
                  </CardContent>
                </Card>
              {/each}

              {#if filteredPositions.length > paginatedPositions.length}
                <div class="flex justify-center pt-4 pb-8">
                  <Button
                    variant="outline"
                    onclick={() => positionPage++}
                    class="w-full max-w-xs"
                  >
                    Load More Positions ({filteredPositions.length -
                      paginatedPositions.length} remaining)
                  </Button>
                </div>
              {/if}
            </div>

          {#if filteredPositions.length === 0}
            <Card>
              <CardContent class="p-6 text-center">
                <Briefcase class="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">No Positions Found</h3>
                <p class="text-gray-600 mb-4">
                  No positions match your current filters.
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
            Send emails or SMS messages to the {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} in your current search results.
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
  </div>
</div>

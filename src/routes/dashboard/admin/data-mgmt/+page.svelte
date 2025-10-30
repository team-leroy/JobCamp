<script lang="ts">
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
  } from "lucide-svelte";
  import StudentEditModal from "./StudentEditModal.svelte";
  import FilterSelect from "$lib/components/ui/filter-select/FilterSelect.svelte";

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
  }

  interface Props {
    data: {
      hasActiveEvent: boolean;
      activeEvent: {
        id: string;
        name: string;
        date: Date;
      } | null;
      students: Student[];
      totalStudents: number;
    };
  }

  let { data }: Props = $props();

  // Filter states
  let lastNameFilter = $state("");
  let gradeFilter = $state("All");
  let permissionSlipFilter = $state("All");
  let lotteryStatusFilter = $state("All");

  // UI states
  let expandedStudents = $state(new Set<string>());
  let selectedTab = $state("Student");

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

      return (
        matchesLastName &&
        matchesGrade &&
        matchesPermissionSlip &&
        matchesLotteryStatus
      );
    })
  );

  function toggleStudentExpansion(studentId: string) {
    if (expandedStudents.has(studentId)) {
      expandedStudents.delete(studentId);
    } else {
      expandedStudents.add(studentId);
    }
    expandedStudents = new Set(expandedStudents);
  }

  function clearFilters() {
    lastNameFilter = "";
    gradeFilter = "All";
    permissionSlipFilter = "All";
    lotteryStatusFilter = "All";
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

<div class="container mx-auto p-6">
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
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
            Results: {filteredStudents.length} students found
          </p>
        </div>

        <!-- Student List -->
        <div class="space-y-4">
          {#each filteredStudents as student (student.id)}
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

                    <StudentEditModal {student} />
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
                      <span class="text-sm {getStatusColor(statusInfo.status)}">
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
                        <h4 class="font-semibold mb-2">Lottery Assignment:</h4>
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
      <Card>
        <CardContent class="p-6 text-center">
          <h3 class="text-lg font-semibold mb-2">Company Management</h3>
          <p class="text-gray-600">
            Company management interface coming soon...
          </p>
        </CardContent>
      </Card>
    {/if}

    {#if selectedTab === "Host"}
      <Card>
        <CardContent class="p-6 text-center">
          <h3 class="text-lg font-semibold mb-2">Host Management</h3>
          <p class="text-gray-600">Host management interface coming soon...</p>
        </CardContent>
      </Card>
    {/if}

    {#if selectedTab === "Position"}
      <Card>
        <CardContent class="p-6 text-center">
          <h3 class="text-lg font-semibold mb-2">Position Management</h3>
          <p class="text-gray-600">
            Position management interface coming soon...
          </p>
        </CardContent>
      </Card>
    {/if}
  {/if}
</div>

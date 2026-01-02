<script lang="ts">
  import Navbar from "$lib/components/navbar/Navbar.svelte";
  import { Button } from "$lib/components/ui/button";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    Chart,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    BarController,
    DoughnutController,
    ArcElement,
    LineController,
    LineElement,
    PointElement,
  } from "chart.js";

  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const loggedIn = $derived(data.loggedIn);
  const isHost = $derived(data.isHost);
  const isAdmin = $derived(data.isAdmin);
  const userRole = $derived(data.userRole);
  const selectedEvent = $derived(data.selectedEvent);
  const allEvents = $derived(data.allEvents);
  const lotteryStats = $derived(data.lotteryStats);
  const companyStats = $derived(data.companyStats);
  const studentStats = $derived(data.studentStats);
  const timelineStats = $derived(data.timelineStats);
  // Chart variables
  let chartCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let chart = $state<Chart | null>(null);
  let selectedVisualization = $state("lottery");
  let selectedEventId = $state("");
  $effect.pre(() => {
    if (!selectedEventId && data.selectedEvent?.id) {
      selectedEventId = data.selectedEvent.id;
    }
  });

  // Event selection handler
  function handleEventChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const eventId = target.value;
    selectedEventId = eventId;

    // Navigate to the same page with the selected event ID
    const url = new URL(window.location.href);
    if (eventId) {
      url.searchParams.set("eventId", eventId);
    } else {
      url.searchParams.delete("eventId");
    }
    goto(url.toString());
  }

  // Available visualizations
  const visualizations = [
    {
      value: "lottery",
      label: "Lottery Results",
      description: "Student placement distribution by choice preference",
    },
    {
      value: "company",
      label: "Company Analytics",
      description: "Company participation and position statistics",
    },
    {
      value: "student",
      label: "Student Demographics",
      description: "Student registration and grade distribution",
    },
    {
      value: "timeline",
      label: "Event Timeline",
      description: "Registration and lottery timeline analysis",
    },
  ];

  // Register Chart.js components
  Chart.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    BarController,
    DoughnutController,
    ArcElement,
    LineController,
    LineElement,
    PointElement
  );

  function createChart() {
    if (!chartCanvas || !lotteryStats) return;

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const ctx = chartCanvas.getContext("2d");
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [
          "1st Choice",
          "2nd Choice",
          "3rd Choice",
          "4th Choice",
          "5th Choice",
          "6th Choice",
          "7th Choice",
          "8th Choice",
          "9th Choice",
          "10th Choice",
          "Not Placed",
        ],
        datasets: [
          {
            label: "Students",
            data: [
              lotteryStats.firstChoice,
              lotteryStats.secondChoice,
              lotteryStats.thirdChoice,
              lotteryStats.fourthChoice,
              lotteryStats.fifthChoice,
              lotteryStats.sixthChoice,
              lotteryStats.seventhChoice,
              lotteryStats.eighthChoice,
              lotteryStats.ninthChoice,
              lotteryStats.tenthChoice,
              lotteryStats.notPlaced,
            ],
            backgroundColor: [
              "#10b981", // Green for 1st choice
              "#f59e0b", // Yellow for 2nd choice
              "#f97316", // Orange for 3rd choice
              "#8b5cf6", // Purple for 4th choice
              "#3b82f6", // Blue for 5th choice
              "#ec4899", // Pink for 6th choice
              "#06b6d4", // Cyan for 7th choice
              "#84cc16", // Lime for 8th choice
              "#fbbf24", // Amber for 9th choice
              "#f97316", // Orange for 10th choice
              "#ef4444", // Red for not placed
            ],
            borderColor: [
              "#059669",
              "#d97706",
              "#ea580c",
              "#7c3aed",
              "#2563eb",
              "#db2777",
              "#0891b2",
              "#65a30d",
              "#d97706",
              "#ea580c",
              "#dc2626",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Lottery Results - Choice Distribution",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label: function (tooltipItem: any) {
                const data = tooltipItem.dataset.data;
                const value = tooltipItem.parsed.y;
                const total = data.reduce(
                  (a: number, b: number | null) => a + (b ?? 0),
                  0
                );
                const percentage = ((value / total) * 100).toFixed(1);
                return `${value} students (${percentage}%)`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Students" },
          },
          x: {
            title: { display: true, text: "Choice Level" },
          },
        },
      },
    });
  }

  // Create lottery chart when data is available
  $effect(() => {
    if (selectedVisualization === "lottery" && data.lotteryStats) {
      // Use a longer timeout to ensure canvas is properly bound
      setTimeout(() => {
        createChart();
      }, 100);
    }
  });

  // Cleanup on unmount
  onMount(() => {
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  });

  // Company Analytics Charts
  let careerChartCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let companyChartCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let careerChart = $state<Chart | null>(null);
  let companyChart = $state<Chart | null>(null);

  function createCareerChart() {
    if (!careerChartCanvas || !companyStats) return;

    if (careerChart) {
      careerChart.destroy();
      careerChart = null;
    }

    const ctx = careerChartCanvas.getContext("2d");
    if (!ctx) return;

    const topCareers = companyStats.careerStats.slice(0, 10);

    careerChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: topCareers.map((c) => c.career),
        datasets: [
          {
            label: "Top 3 Choices",
            data: topCareers.map((c) => c.totalChoices),
            backgroundColor: "#3b82f6",
            borderColor: "#2563eb",
            borderWidth: 1,
          },
          {
            label: "Total Slots",
            data: topCareers.map((c) => c.totalSlots),
            backgroundColor: "#10b981",
            borderColor: "#059669",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Positions by Career Field (Top 3 Choices)",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Count" },
          },
        },
      },
    });
  }

  function createCompanyChart() {
    if (!companyChartCanvas || !companyStats) return;

    if (companyChart) {
      companyChart.destroy();
      companyChart = null;
    }

    const ctx = companyChartCanvas.getContext("2d");
    if (!ctx) return;

    const topCompanies = companyStats.companyStats.slice(0, 10);

    companyChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: topCompanies.map((c) => c.company),
        datasets: [
          {
            data: topCompanies.map((c) => c.totalChoices),
            backgroundColor: [
              "#1e40af", // Dark blue
              "#3b82f6", // Blue
              "#60a5fa", // Light blue
              "#93c5fd", // Lighter blue
              "#dbeafe", // Very light blue
              "#1e3a8a", // Navy blue
              "#1d4ed8", // Royal blue
              "#2563eb", // Medium blue
              "#7c3aed", // Purple (for variety)
              "#8b5cf6", // Light purple
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Company Popularity by Student Choices",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            position: "right",
          },
        },
      },
    });
  }

  // Create company charts when data is available
  $effect(() => {
    if (selectedVisualization === "company" && data.companyStats) {
      setTimeout(() => {
        createCareerChart();
        createCompanyChart();
      }, 0);
    }
  });

  // Student Demographics Charts
  let gradeChartCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let choiceChartCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let slotChartCanvas = $state<HTMLCanvasElement | undefined>(undefined);
  let choiceVsSlotsChartCanvas = $state<HTMLCanvasElement | undefined>(
    undefined
  );
  let gradeChart = $state<Chart | null>(null);
  let choiceChart = $state<Chart | null>(null);
  let slotChart = $state<Chart | null>(null);
  let choiceVsSlotsChart = $state<Chart | null>(null);

  // Event Timeline Charts
  let registrationChartCanvas = $state<HTMLCanvasElement | undefined>(
    undefined
  );
  let choiceTimelineChartCanvas = $state<HTMLCanvasElement | undefined>(
    undefined
  );
  let companyTimelineChartCanvas = $state<HTMLCanvasElement | undefined>(
    undefined
  );
  let registrationChart = $state<Chart | null>(null);
  let choiceTimelineChart = $state<Chart | null>(null);
  let companyTimelineChart = $state<Chart | null>(null);

  function createGradeChart() {
    if (!gradeChartCanvas || !studentStats) return;

    if (gradeChart) {
      gradeChart.destroy();
      gradeChart = null;
    }

    const ctx = gradeChartCanvas.getContext("2d");
    if (!ctx) return;

    gradeChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: studentStats.gradeStats.map((g) => `Grade ${g.grade}`),
        datasets: [
          {
            label: "Total Students",
            data: studentStats.gradeStats.map((g) => g.totalStudents),
            backgroundColor: "#3b82f6",
            borderColor: "#2563eb",
            borderWidth: 1,
          },
          {
            label: "Students with Choices",
            data: studentStats.gradeStats.map((g) => g.studentsWithChoices),
            backgroundColor: "#10b981",
            borderColor: "#059669",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Student Distribution by Grade",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Students" },
          },
        },
      },
    });
  }

  function createChoiceChart() {
    if (!choiceChartCanvas || !studentStats) return;

    if (choiceChart) {
      choiceChart.destroy();
      choiceChart = null;
    }

    const ctx = choiceChartCanvas.getContext("2d");
    if (!ctx) return;

    choiceChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: studentStats.choiceStats.map((c) => `${c.choices} choices`),
        datasets: [
          {
            label: "Number of Students",
            data: studentStats.choiceStats.map((c) => c.count),
            backgroundColor: "#8b5cf6",
            borderColor: "#7c3aed",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Distribution of Student Choices",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Students" },
          },
        },
      },
    });
  }

  function createSlotChart() {
    if (!slotChartCanvas || !studentStats) return;

    if (slotChart) {
      slotChart.destroy();
      slotChart = null;
    }

    const ctx = slotChartCanvas.getContext("2d");
    if (!ctx) return;

    // Use the new slot availability stats
    const slotData = studentStats.slotAvailabilityStats;

    if (!slotData || slotData.length === 0) {
      return;
    }

    slotChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: slotData.map((s) => s.category),
        datasets: [
          {
            label: "Count",
            data: slotData.map((s) => s.value),
            backgroundColor: slotData.map((s) => s.color),
            borderColor: slotData.map((s) => s.color),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Slot Availability Overview",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Count" },
          },
        },
      },
    });
  }

  function createChoiceVsSlotsChart() {
    if (!choiceVsSlotsChartCanvas || !studentStats) return;

    if (choiceVsSlotsChart) {
      choiceVsSlotsChart.destroy();
      choiceVsSlotsChart = null;
    }

    const ctx = choiceVsSlotsChartCanvas.getContext("2d");
    if (!ctx) return;

    // Filter out students with 0 choices since they have no slot data
    const filteredData = studentStats.slotStats.filter((s) => s.choices > 0);

    if (filteredData.length === 0) {
      return;
    }

    choiceVsSlotsChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: filteredData.map((s) => `${s.choices} choices`),
        datasets: [
          {
            label: "Number of Students",
            data: filteredData.map((s) => s.studentCount),
            backgroundColor: "#3b82f6",
            borderColor: "#2563eb",
            borderWidth: 1,
            yAxisID: "y",
          },
          {
            label: "Average Slots Available",
            data: filteredData.map((s) => s.averageSlots),
            backgroundColor: "#10b981",
            borderColor: "#059669",
            borderWidth: 1,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Student Choice Patterns vs Available Slots",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: { display: true, text: "Number of Students" },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: { display: true, text: "Average Slots Available" },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }

  function createRegistrationChart() {
    if (!registrationChartCanvas || !timelineStats) return;

    if (registrationChart) {
      registrationChart.destroy();
      registrationChart = null;
    }

    const ctx = registrationChartCanvas.getContext("2d");
    if (!ctx) return;

    registrationChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: timelineStats.registrationStats.map((r) => r.date),
        datasets: [
          {
            label: "Student Registrations",
            data: timelineStats.registrationStats.map((r) => r.count),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Student Registration Timeline",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Registrations" },
          },
          x: {
            title: { display: true, text: "Date" },
          },
        },
      },
    });
  }

  function createChoiceTimelineChart() {
    if (!choiceTimelineChartCanvas || !timelineStats) return;

    if (choiceTimelineChart) {
      choiceTimelineChart.destroy();
      choiceTimelineChart = null;
    }

    const ctx = choiceTimelineChartCanvas.getContext("2d");
    if (!ctx) return;

    choiceTimelineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: timelineStats.choiceStats.map((c) => c.date),
        datasets: [
          {
            label: "Choice Submissions",
            data: timelineStats.choiceStats.map((c) => c.count),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Choice Submission Timeline",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Submissions" },
          },
          x: {
            title: { display: true, text: "Date" },
          },
        },
      },
    });
  }

  function createCompanyTimelineChart() {
    if (!companyTimelineChartCanvas || !timelineStats) return;

    if (companyTimelineChart) {
      companyTimelineChart.destroy();
      companyTimelineChart = null;
    }

    const ctx = companyTimelineChartCanvas.getContext("2d");
    if (!ctx) return;

    // Merge dates from both companyStats and positionStats to ensure we have labels
    const allDates = new Set([
      ...timelineStats.companyStats.map((c) => c.date),
      ...timelineStats.positionStats.map((p) => p.date),
    ]);
    const sortedDates = Array.from(allDates).sort();

    // Create maps for quick lookup
    const companyMap = new Map(
      timelineStats.companyStats.map((c) => [c.date, c.count])
    );
    const positionMap = new Map(
      timelineStats.positionStats.map((p) => [p.date, p.count])
    );

    // Build aligned data arrays (use 0 for missing dates)
    const companyData = sortedDates.map((date) => companyMap.get(date) || 0);
    const positionData = sortedDates.map((date) => positionMap.get(date) || 0);

    companyTimelineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: sortedDates,
        datasets: [
          {
            label: "Company Registrations",
            data: companyData,
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
          {
            label: "Position Creations",
            data: positionData,
            borderColor: "#f97316",
            backgroundColor: "rgba(249, 115, 22, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Company Engagement Timeline",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Count" },
          },
          x: {
            title: { display: true, text: "Date" },
          },
        },
      },
    });
  }

  // Create student charts when data is available
  $effect(() => {
    if (selectedVisualization === "student" && data.studentStats) {
      setTimeout(() => {
        createGradeChart();
        createChoiceChart();
        createSlotChart();
        createChoiceVsSlotsChart();
      }, 0);
    }
  });

  // Create timeline charts when data is available
  $effect(() => {
    if (selectedVisualization === "timeline" && data.timelineStats) {
      setTimeout(() => {
        createRegistrationChart();
        createChoiceTimelineChart();
        createCompanyTimelineChart();
      }, 0);
    }
  });
</script>

<Navbar
  {loggedIn}
  {isHost}
  {isAdmin}
  {userRole}
/>

<div class="h-28"></div>

<div class="container mx-auto px-6 py-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-2">Data Visualizations</h1>
    <p class="text-gray-600">
      Interactive analytics and insights from your JobCamp data.
    </p>
  </div>

  <!-- Event Selector -->
  {#if allEvents && allEvents.length > 0}
    <div class="mb-6">
      <label
        for="event-selector"
        class="block text-sm font-medium text-gray-700 mb-2"
      >
        Select Event to View:
      </label>
      <select
        id="event-selector"
        bind:value={selectedEventId}
        onchange={handleEventChange}
        class="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        {#each allEvents as event}
          <option value={event.id}>
            {event.name || `Event ${event.date.toLocaleDateString()}`}
            {event.isActive
              ? " (Active)"
              : event.isArchived
                ? " (Archived)"
                : " (Draft)"}
          </option>
        {/each}
      </select>
      {#if selectedEvent}
        <p class="mt-2 text-sm text-gray-600">
          Viewing data for: <span class="font-medium"
            >{selectedEvent.name ||
              `Event ${selectedEvent.date.toLocaleDateString()}`}</span
          >
          {selectedEvent.isActive
            ? " (Active Event)"
            : selectedEvent.isArchived
              ? " (Archived Event)"
              : " (Draft Event)"}
        </p>
      {/if}
    </div>
  {/if}

  <!-- No Event Notice -->
  {#if !selectedEvent}
    <div class="mb-8 p-6 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
      <h2 class="text-xl font-semibold text-yellow-800 mb-2">
        No Event Selected
      </h2>
      <p class="text-yellow-700">
        Please select an event from the dropdown above to view visualizations.
        <a
          href="/dashboard/admin/event-mgmt"
          class="text-yellow-800 hover:text-yellow-900 underline font-medium"
        >
          Go to Event Management
        </a> to manage events.
      </p>
    </div>
  {/if}

  <!-- Visualization Selector -->
  {#if selectedEvent}
    <div class="mb-8 bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Select Visualization</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each visualizations as viz}
          <button
            class="p-4 border rounded-lg text-left transition-colors {selectedVisualization ===
            viz.value
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'}"
            onclick={() => (selectedVisualization = viz.value)}
          >
            <div class="font-semibold text-gray-900">{viz.label}</div>
            <div class="text-sm text-gray-600 mt-1">{viz.description}</div>
            {#if selectedVisualization === viz.value}
              <div class="text-xs text-blue-600 mt-2">✓ Selected</div>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    {#if selectedVisualization === "lottery" && lotteryStats}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Chart -->
        <div class="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Choice Distribution</h2>
          <div class="h-96">
            <canvas bind:this={chartCanvas} width="800" height="400"></canvas>
          </div>
        </div>

        <!-- Summary Stats -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Summary</h2>
          <div class="space-y-4">
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">
                {lotteryStats.firstChoice}
              </div>
              <div class="text-sm text-green-600">Got 1st Choice</div>
              <div class="text-xs text-gray-500">
                {(
                  (lotteryStats.firstChoice / lotteryStats.totalStudents) *
                  100
                ).toFixed(1)}% of students
              </div>
            </div>

            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <div class="text-2xl font-bold text-yellow-600">
                {lotteryStats.secondChoice}
              </div>
              <div class="text-sm text-yellow-600">Got 2nd Choice</div>
              <div class="text-xs text-gray-500">
                {(
                  (lotteryStats.secondChoice / lotteryStats.totalStudents) *
                  100
                ).toFixed(1)}% of students
              </div>
            </div>

            <div class="text-center p-4 bg-orange-50 rounded-lg">
              <div class="text-2xl font-bold text-orange-600">
                {lotteryStats.thirdChoice}
              </div>
              <div class="text-sm text-orange-600">Got 3rd Choice</div>
              <div class="text-xs text-gray-500">
                {(
                  (lotteryStats.thirdChoice / lotteryStats.totalStudents) *
                  100
                ).toFixed(1)}% of students
              </div>
            </div>

            <div class="text-center p-4 bg-red-50 rounded-lg">
              <div class="text-2xl font-bold text-red-600">
                {lotteryStats.notPlaced}
              </div>
              <div class="text-sm text-red-600">Not Placed</div>
              <div class="text-xs text-gray-500">
                {(
                  (lotteryStats.notPlaced / lotteryStats.totalStudents) *
                  100
                ).toFixed(1)}% of students
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Stats -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Detailed Statistics</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div class="text-center">
            <div class="text-lg font-semibold">
              {lotteryStats.totalStudents}
            </div>
            <div class="text-sm text-gray-600">Total Students</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-green-600">
              {lotteryStats.firstChoice +
                lotteryStats.secondChoice +
                lotteryStats.thirdChoice}
            </div>
            <div class="text-sm text-gray-600">Top 3 Choices</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-blue-600">
              {lotteryStats.totalStudents - lotteryStats.notPlaced}
            </div>
            <div class="text-sm text-gray-600">Successfully Placed</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-purple-600">
              {(
                (lotteryStats.firstChoice / lotteryStats.totalStudents) *
                100
              ).toFixed(1)}%
            </div>
            <div class="text-sm text-gray-600">1st Choice Rate</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-orange-600">
              {(
                ((lotteryStats.totalStudents - lotteryStats.notPlaced) /
                  lotteryStats.totalStudents) *
                100
              ).toFixed(1)}%
            </div>
            <div class="text-sm text-gray-600">Placement Rate</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-red-600">
              {(
                (lotteryStats.notPlaced / lotteryStats.totalStudents) *
                100
              ).toFixed(1)}%
            </div>
            <div class="text-sm text-gray-600">Not Placed Rate</div>
          </div>
        </div>
      </div>
    {:else if selectedVisualization === "lottery" && !lotteryStats}
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">No Lottery Data Available</h2>
        <p class="text-gray-600 mb-4">
          No lottery results are currently available. Run the lottery first to
          see the analysis.
        </p>
        <Button href="/lottery" variant="default">Go to Lottery</Button>
      </div>
    {:else if selectedVisualization === "company" && companyStats}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Career Field Distribution -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Career Field Distribution</h2>
          <p class="text-gray-600 mb-4">
            Shows student choices for each career field (1st, 2nd, and 3rd
            choices only)
          </p>
          <div class="h-96">
            <canvas bind:this={careerChartCanvas} width="800" height="400"
            ></canvas>
          </div>
        </div>

        <!-- Company Popularity -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Company Popularity</h2>
          <div class="h-96">
            <canvas bind:this={companyChartCanvas} width="800" height="400"
            ></canvas>
          </div>
        </div>
      </div>

      <!-- Company Summary -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Company Summary</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div class="text-center">
            <div class="text-lg font-semibold">
              {companyStats.totalCompanies}
            </div>
            <div class="text-sm text-gray-600">Total Companies</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-green-600">
              {companyStats.totalChoices}
            </div>
            <div class="text-sm text-gray-600">Top 3 Student Choices</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-blue-600">
              {companyStats.totalSlots}
            </div>
            <div class="text-sm text-gray-600">Total Available Slots</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-purple-600">
              {companyStats.totalPositions}
            </div>
            <div class="text-sm text-gray-600">Total Positions</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-orange-600">
              {(
                (companyStats.totalChoices / companyStats.totalSlots) *
                100
              ).toFixed(1)}%
            </div>
            <div class="text-sm text-gray-600">Fill Rate</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-red-600">
              {(companyStats.totalChoices / companyStats.totalPositions).toFixed(
                1
              )}
            </div>
            <div class="text-sm text-gray-600">
              Avg Top 3 Choices per Position
            </div>
          </div>
        </div>
      </div>

      <!-- Company Subscription Rate Statistics -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Company Subscription Rates</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div class="text-center">
            <div class="text-lg font-semibold">
              {companyStats.totalPositions}
            </div>
            <div class="text-sm text-gray-600">Total Positions</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-green-600">
              {companyStats.totalChoices}
            </div>
            <div class="text-sm text-gray-600">Total Choices</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-blue-600">
              {companyStats.totalSlots}
            </div>
            <div class="text-sm text-gray-600">Total Slots</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-purple-600">
              {(companyStats.overallSubscriptionRate * 100).toFixed(1)}%
            </div>
            <div class="text-sm text-gray-600">Overall Subscription Rate</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-orange-600">
              {companyStats.companySubscriptionStats.length}
            </div>
            <div class="text-sm text-gray-600">Companies with Choices</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-red-600">
              {(companyStats.totalChoices / companyStats.totalPositions).toFixed(
                1
              )}
            </div>
            <div class="text-sm text-gray-600">Avg Choices per Position</div>
          </div>
        </div>

        <!-- Company Subscription Details Table -->
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Company</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Positions</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Total Choices</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Total Slots</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Subscription Rate</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Status</th
                >
              </tr>
            </thead>
            <tbody>
              {#each companyStats.companySubscriptionStats as company}
                <tr>
                  <td class="py-2 px-4 border-b text-sm text-gray-800"
                    >{company.company}</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-gray-600"
                    >{company.totalPositions}</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-green-600"
                    >{company.totalChoices}</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-blue-600"
                    >{company.totalSlots}</td
                  >
                  <td class="py-2 px-4 border-b text-sm font-medium">
                    <span
                      class={company.averageSubscriptionRate > 1
                        ? "text-red-600"
                        : company.averageSubscriptionRate > 0.5
                          ? "text-orange-600"
                          : "text-green-600"}
                    >
                      {(company.averageSubscriptionRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td class="py-2 px-4 border-b text-sm">
                    {#if company.averageSubscriptionRate > 1}
                      <span
                        class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs"
                        >Oversubscribed</span
                      >
                    {:else if company.averageSubscriptionRate > 0.5}
                      <span
                        class="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs"
                        >Moderate</span
                      >
                    {:else}
                      <span
                        class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                        >Available</span
                      >
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Career Field Details Table -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Career Field Details</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Career Field</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Total Choices</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Total Slots</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Slots Filled</th
                >
              </tr>
            </thead>
            <tbody>
              {#each companyStats.careerStats as career}
                <tr>
                  <td class="py-2 px-4 border-b text-sm text-gray-800"
                    >{career.career}</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-green-600"
                    >{career.totalChoices}</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-blue-600"
                    >{career.totalSlots}</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-red-600"
                    >{career.totalSlots - career.totalChoices}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else if selectedVisualization === "company" && !companyStats}
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">No Company Data Available</h2>
        <p class="text-gray-600 mb-4">
          No company participation data is currently available. Ensure students
          have registered and selected companies.
        </p>
      </div>
    {:else if selectedVisualization === "student" && studentStats}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Grade Distribution -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">
            Student Distribution by Grade
          </h2>
          <div class="h-96">
            <canvas bind:this={gradeChartCanvas} width="800" height="400"
            ></canvas>
          </div>
        </div>

        <!-- Choice Distribution -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">
            Distribution of Student Choices
          </h2>
          <div class="h-96">
            <canvas bind:this={choiceChartCanvas} width="800" height="400"
            ></canvas>
          </div>
        </div>

        <!-- Slot Availability Overview -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Slot Availability Overview</h2>
          <div class="h-96">
            <canvas bind:this={slotChartCanvas} width="800" height="400"
            ></canvas>
          </div>
        </div>
      </div>

      <!-- Student Summary -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Student Summary</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div class="text-center">
            <div class="text-lg font-semibold">
              {studentStats.totalStudents}
            </div>
            <div class="text-sm text-gray-600">Total Students</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-green-600">
              {studentStats.totalStudentsWithChoices}
            </div>
            <div class="text-sm text-gray-600">Students with Choices</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-blue-600">
              {studentStats.totalChoices}
            </div>
            <div class="text-sm text-gray-600">Total Student Choices</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-purple-600">
              {studentStats.averageChoicesPerStudent.toFixed(1)}
            </div>
            <div class="text-sm text-gray-600">Avg Choices per Student</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-orange-600">
              {studentStats.totalAvailableSlots}
            </div>
            <div class="text-sm text-gray-600">Total Available Slots</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-red-600">
              {studentStats.studentsWithNoChoices.length}
            </div>
            <div class="text-sm text-gray-600">Students with No Choices</div>
          </div>
        </div>
      </div>

      <!-- Student Details Table -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Student Details</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Grade</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Total Students</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Students with Choices</th
                >
              </tr>
            </thead>
            <tbody>
              {#each studentStats.gradeStats as grade}
                <tr>
                  <td class="py-2 px-4 border-b text-sm text-gray-800"
                    >{grade.grade}</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-green-600"
                    >{grade.totalStudents}</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-blue-600"
                    >{grade.studentsWithChoices}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Choice Details Table -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Choice Details</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Number of Choices</th
                >
                <th
                  class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600"
                  >Count</th
                >
              </tr>
            </thead>
            <tbody>
              {#each studentStats.choiceStats as choice}
                <tr>
                  <td class="py-2 px-4 border-b text-sm text-gray-800"
                    >{choice.choices} choices</td
                  >
                  <td class="py-2 px-4 border-b text-sm text-blue-600"
                    >{choice.count}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Slot Details Table -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">
          Choice Patterns vs Slot Availability
        </h2>
        <div class="h-96">
          <canvas bind:this={choiceVsSlotsChartCanvas} width="800" height="400"
          ></canvas>
        </div>
      </div>
    {:else if selectedVisualization === "student" && !studentStats}
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">No Student Data Available</h2>
        <p class="text-gray-600 mb-4">
          No student registration or choice data is currently available. Ensure
          students have registered and selected companies.
        </p>
      </div>
    {:else if selectedVisualization === "timeline" && timelineStats}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Registration Timeline -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">
            Student Registration Timeline
          </h2>
          <div class="h-96">
            <canvas bind:this={registrationChartCanvas} width="800" height="400"
            ></canvas>
          </div>
        </div>

        <!-- Choice Submission Timeline -->
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Choice Submission Timeline</h2>
          <div class="h-96">
            <canvas
              bind:this={choiceTimelineChartCanvas}
              width="800"
              height="400"
            ></canvas>
          </div>
        </div>

        <!-- Company Engagement Timeline -->
        <div class="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 class="text-xl font-semibold mb-4">
            Company Engagement Timeline
          </h2>
          <div class="h-96">
            <canvas
              bind:this={companyTimelineChartCanvas}
              width="800"
              height="400"
            ></canvas>
          </div>
        </div>
      </div>

      <!-- Event Milestones -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Event Milestones</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="text-center">
            <div class="text-lg font-semibold text-blue-600">
              {timelineStats.milestones.totalStudents}
            </div>
            <div class="text-sm text-gray-600">Total Students</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-green-600">
              {timelineStats.milestones.studentsWithChoices}
            </div>
            <div class="text-sm text-gray-600">Students with Choices</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-purple-600">
              {timelineStats.milestones.totalCompanies}
            </div>
            <div class="text-sm text-gray-600">Total Companies</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold text-orange-600">
              {timelineStats.milestones.totalPositions}
            </div>
            <div class="text-sm text-gray-600">Total Positions</div>
          </div>
        </div>

        <!-- Timeline Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-semibold mb-3">Registration Period</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">First Registration:</span>
                <span class="font-medium"
                  >{timelineStats.milestones.firstRegistration
                    ? new Date(
                        timelineStats.milestones.firstRegistration
                      ).toLocaleDateString()
                    : "N/A"}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Last Registration:</span>
                <span class="font-medium"
                  >{timelineStats.milestones.lastRegistration
                    ? new Date(
                        timelineStats.milestones.lastRegistration
                      ).toLocaleDateString()
                    : "N/A"}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Duration:</span>
                <span class="font-medium"
                  >{timelineStats.velocity.totalDays} days</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Avg per Day:</span>
                <span class="font-medium"
                  >{timelineStats.velocity.avgRegistrationsPerDay.toFixed(
                    1
                  )}</span
                >
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-3">Choice Period</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">First Choice:</span>
                <span class="font-medium"
                  >{timelineStats.milestones.firstChoice
                    ? new Date(
                        timelineStats.milestones.firstChoice
                      ).toLocaleDateString()
                    : "N/A"}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Last Choice:</span>
                <span class="font-medium"
                  >{timelineStats.milestones.lastChoice
                    ? new Date(
                        timelineStats.milestones.lastChoice
                      ).toLocaleDateString()
                    : "N/A"}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Duration:</span>
                <span class="font-medium"
                  >{timelineStats.velocity.choiceDays} days</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Avg per Day:</span>
                <span class="font-medium"
                  >{timelineStats.velocity.avgChoicesPerDay.toFixed(1)}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else if selectedVisualization === "timeline" && !timelineStats}
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">No Timeline Data Available</h2>
        <p class="text-gray-600 mb-4">
          No event timeline data is currently available. Ensure students and
          companies have registered and made choices.
        </p>
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Coming Soon</h2>
        <p class="text-gray-600 mb-4">
          The {visualizations.find((v) => v.value === selectedVisualization)
            ?.label} visualization is under development and will be available soon.
        </p>
      </div>
    {/if}
  {/if}
</div>

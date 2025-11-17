<script lang="ts">
    export let stats: {
        totalStudents: number;
        permissionSlipsSigned: number;
        studentsWithoutChoices: number;
        totalStudentChoices: number;
        freshman: number;
        sophomore: number;
        junior: number;
        senior: number;
    };
</script>

<div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-4">Student Statistics</h2>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
            <div class="text-sm text-gray-600">Total Registered</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{stats.permissionSlipsSigned}</div>
            <div class="text-sm text-gray-600">Permission Slips</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{stats.studentsWithoutChoices}</div>
            <div class="text-sm text-gray-600">No Choices</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{stats.totalStudentChoices}</div>
            <div class="text-sm text-gray-600">Total Choices</div>
        </div>
    </div>
    
    <div class="mt-6">
        <h3 class="font-semibold mb-2">Grade Distribution</h3>
        <div class="grid grid-cols-4 gap-4">
            <div class="text-center">
                <div class="text-lg font-semibold">{stats.freshman}</div>
                <div class="text-sm text-gray-600">Freshman</div>
            </div>
            <div class="text-center">
                <div class="text-lg font-semibold">{stats.sophomore}</div>
                <div class="text-sm text-gray-600">Sophomore</div>
            </div>
            <div class="text-center">
                <div class="text-lg font-semibold">{stats.junior}</div>
                <div class="text-sm text-gray-600">Junior</div>
            </div>
            <div class="text-center">
                <div class="text-lg font-semibold">{stats.senior}</div>
                <div class="text-sm text-gray-600">Senior</div>
            </div>
        </div>
    </div>
</div>
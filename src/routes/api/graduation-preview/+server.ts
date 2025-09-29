import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { getGraduationEligibleStudents } from '$lib/server/eventManagement';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  console.log("🎓 API graduation-preview called");
  
  if (!locals.user) {
    console.log("❌ No user in locals");
    return json({ 
      success: false, 
      message: "User not authenticated",
      students: []
    });
  }

  try {
    // Get user's school
    const userInfo = await prisma.user.findFirst({
      where: { id: locals.user.id },
      include: { adminOfSchools: true }
    });

    console.log("👤 User info:", { 
      userId: locals.user.id, 
      adminSchools: userInfo?.adminOfSchools?.length || 0 
    });

    if (!userInfo?.adminOfSchools?.length) {
      console.log("❌ User not authorized - no admin schools");
      return json({ success: false, message: "Not authorized", students: [] });
    }

    const schoolId = userInfo.adminOfSchools[0].id;
    console.log("🏫 School ID:", schoolId);
    
    const eligibleStudents = await getGraduationEligibleStudents(schoolId);
    console.log("🎓 Eligible students found:", eligibleStudents.length);
    console.log("📋 Students:", eligibleStudents.map(s => `${s.firstName} ${s.lastName} (Grade ${s.grade})`));

    return json({ 
      success: true, 
      students: eligibleStudents,
      message: `Found ${eligibleStudents.length} Grade 12 students eligible for graduation`
    });
  } catch (error) {
    console.error('❌ Error getting graduation preview:', error);
    return json({ 
      success: false, 
      message: "Failed to get graduation preview",
      students: []
    });
  }
};

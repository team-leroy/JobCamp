const { PrismaClient } = require('@prisma/client');
const { deleteEvent } = require('./src/lib/server/eventManagement.ts');

const prisma = new PrismaClient();

async function testDelete() {
  try {
    // Get the school ID first
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log('No school found');
      return;
    }
    
    console.log('School ID:', school.id);
    
    // Try to delete the inactive event
    const eventId = 'cmg19gkb8000jx4r35gwi8eq5'; // "Another new event"
    console.log('Attempting to delete event:', eventId);
    
    const result = await deleteEvent(eventId, school.id);
    console.log('Delete result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDelete();

/**
 * College ERP — Seed Data (Firestore)
 * Populates Firestore with demo data if empty
 */
async function seedData() {
  if (await Store.isSeeded()) return;

  console.log('Seeding demo data to Firestore...');
  
  // 1. Create records (students, faculty)
  const students = [
    { id: 's1', studentId: 'STU001', name: 'Amit Kumar', course: 'B.Tech CSE', semester: '4', email: 'student1@demo.com', phone: '9876543210' },
    { id: 's2', studentId: 'STU002', name: 'Priya Sharma', course: 'B.Tech CSE', semester: '4', email: 'priya@demo.com', phone: '9876543211' }
  ];
  const faculty = [
    { id: 'f1', facultyId: 'FAC001', name: 'Dr. R.K. Singh', department: 'Computer Science', email: 'faculty1@demo.com', phone: '9876543220', subjects: ['CS201', 'CS202'] },
    { id: 'f2', facultyId: 'FAC002', name: 'Prof. Anjali Verma', department: 'Electronics', email: 'anjali@demo.com', phone: '9876543221', subjects: ['EC201'] }
  ];
  
  await Store.seed('students', students);
  await Store.seed('faculty', faculty);

  // 2. Create Auth Accounts via Firebase
  try {
    // Admin
    await auth.createUserWithEmailAndPassword('admin@demo.com', 'admin123');
    const adminUser = auth.currentUser;
    await db.collection('users').doc(adminUser.uid).set({ uid: adminUser.uid, email: 'admin@demo.com', name: 'Admin User', role: 'admin' });
    await auth.signOut(); // Sign out right away
    
    // Faculty 1
    await auth.createUserWithEmailAndPassword('faculty1@demo.com', 'faculty123');
    const f1User = auth.currentUser;
    await db.collection('users').doc(f1User.uid).set({ uid: f1User.uid, email: 'faculty1@demo.com', name: 'Dr. R.K. Singh', role: 'faculty', linkedId: 'f1' });
    await auth.signOut();

    // Student 1
    await auth.createUserWithEmailAndPassword('student1@demo.com', 'student123');
    const s1User = auth.currentUser;
    await db.collection('users').doc(s1User.uid).set({ uid: s1User.uid, email: 'student1@demo.com', name: 'Amit Kumar', role: 'student', linkedId: 's1' });
    await auth.signOut();
  } catch (err) {
    console.error("Error creating seed auth users:", err.message);
    // Might fail if users already exist from previous runs on this Firebase project
  }

  // 3. Other Data
  const courses = [
    { id: 'c1', code: 'CS201', name: 'Data Structures', credits: 4, semester: '4', department: 'CSE', facultyId: 'f1' },
    { id: 'c2', code: 'CS202', name: 'Operating Systems', credits: 4, semester: '4', department: 'CSE', facultyId: 'f1' },
    { id: 'c3', code: 'EC201', name: 'Digital Logic', credits: 3, semester: '4', department: 'ECE', facultyId: 'f2' }
  ];
  await Store.seed('courses', courses);

  const dt = Utils.today();
  await Store.seed('attendance', [
    { studentId: 's1', subjectCode: 'CS201', date: dt, status: 'present' },
    { studentId: 's2', subjectCode: 'CS201', date: dt, status: 'absent' }
  ]);

  await Store.seed('grades', [
    { studentId: 's1', subjectCode: 'CS201', examType: 'Mid-Term', marks: 85, grade: 'A' },
    { studentId: 's2', subjectCode: 'CS201', examType: 'Mid-Term', marks: 72, grade: 'B' }
  ]);

  await Store.seed('fees', [
    { studentId: 's1', semester: '4', totalAmount: 50000, paidAmount: 50000, status: 'paid' },
    { studentId: 's2', semester: '4', totalAmount: 50000, paidAmount: 25000, status: 'partial' }
  ]);

  await Store.seed('timetable', [
    { day: 'Monday', slot: '09:00-10:00', subjectCode: 'CS201', facultyId: 'f1', room: 'A101' },
    { day: 'Monday', slot: '10:00-11:00', subjectCode: 'CS202', facultyId: 'f1', room: 'A102' }
  ]);

  await Store.markSeeded();
  console.log('Seed complete.');
}

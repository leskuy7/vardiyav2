import * as bcrypt from 'bcryptjs';
import { PrismaClient, ShiftStatus, AvailabilityType } from '@prisma/client';

const prisma = new PrismaClient();

/* ────── helpers ────── */
function monday(weeksFromNow: number): Date {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    m.setUTCDate(m.getUTCDate() + diff + weeksFromNow * 7);
    return m;
}

function shiftTime(base: Date, dayOffset: number, hour: number, minute = 0): Date {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
}

/* ────── data definitions ────── */
/** Üretimde SEED_DEFAULT_PASSWORD env ile güçlü bir şifre verin; yoksa sadece test ortamı için varsayılan kullanılır. */
const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? 'Test12345!';

const accounts = [
    { email: 'admin@test.local', name: 'Ahmet Yılmaz', role: 'ADMIN' as const, position: 'Genel Müdür', department: 'Yönetim', hourlyRate: 180, phone: '+90 530 100 0001' },
    { email: 'manager@test.local', name: 'Elif Kaya', role: 'MANAGER' as const, position: 'Operasyon Müdürü', department: 'Operasyon', hourlyRate: 140, phone: '+90 530 200 0002' },
    { email: 'employee@test.local', name: 'Mehmet Demir', role: 'EMPLOYEE' as const, position: 'Barista', department: 'Operasyon', hourlyRate: 90, phone: '+90 530 300 0003' },
    { email: 'zeynep@test.local', name: 'Zeynep Arslan', role: 'EMPLOYEE' as const, position: 'Kasiyer', department: 'Operasyon', hourlyRate: 85, phone: '+90 530 400 0004' },
    { email: 'can@test.local', name: 'Can Öztürk', role: 'EMPLOYEE' as const, position: 'Garson', department: 'Servis', hourlyRate: 80, phone: '+90 530 500 0005' },
    { email: 'ayse@test.local', name: 'Ayşe Çelik', role: 'EMPLOYEE' as const, position: 'Şef', department: 'Mutfak', hourlyRate: 110, phone: '+90 530 600 0006' },
    { email: 'burak@test.local', name: 'Burak Yıldız', role: 'EMPLOYEE' as const, position: 'Aşçıbaşı', department: 'Mutfak', hourlyRate: 130, phone: '+90 530 700 0007' },
    { email: 'selin@test.local', name: 'Selin Koç', role: 'EMPLOYEE' as const, position: 'Barista', department: 'Operasyon', hourlyRate: 88, phone: '+90 530 800 0008' },
    { email: 'emre@test.local', name: 'Emre Şahin', role: 'EMPLOYEE' as const, position: 'Garson', department: 'Servis', hourlyRate: 82, phone: '+90 530 900 0009' },
    { email: 'fatma@test.local', name: 'Fatma Aydın', role: 'MANAGER' as const, position: 'Servis Müdürü', department: 'Servis', hourlyRate: 120, phone: '+90 530 110 0010' },
    { email: 'ali@test.local', name: 'Ali Korkmaz', role: 'EMPLOYEE' as const, position: 'Bulaşıkçı', department: 'Mutfak', hourlyRate: 75, phone: '+90 530 120 0011' },
    { email: 'deniz@test.local', name: 'Deniz Güneş', role: 'EMPLOYEE' as const, position: 'Kasiyer', department: 'Operasyon', hourlyRate: 85, phone: '+90 530 130 0012' }
];

async function seed() {
    if (process.env.SEED_PROD !== 'true') {
        console.log('⏭️  SEED_PROD=true olmadığı için üretim seed atlandı.');
        return;
    }

    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
        console.log(`⏭️  Veritabanında ${existingUsers} kullanıcı var; seed atlandı (idempotent güvenlik).`);
        return;
    }

    const hash = await bcrypt.hash(PASSWORD, 12);
    const employeeMap: Record<string, string> = {};

    console.log('👥 Kullanıcılar ve çalışanlar oluşturuluyor...');
    for (const acc of accounts) {
        const user = await prisma.user.create({
            data: {
                email: acc.email,
                name: acc.name,
                passwordHash: hash,
                role: acc.role
            }
        });

        const employee = await prisma.employee.create({
            data: {
                userId: user.id,
                position: acc.position,
                department: acc.department,
                hourlyRate: acc.hourlyRate,
                phone: acc.phone,
                maxWeeklyHours: acc.role === 'ADMIN' ? 50 : acc.role === 'MANAGER' ? 48 : 45,
                isActive: true
            }
        });

        employeeMap[acc.email] = employee.id;
        console.log(`  ✅ ${acc.name} (${acc.role}) — ${acc.department}/${acc.position}`);
    }

    /* ─── Shifts: this week + last week + next week ─── */
    console.log('\n📅 Vardiyalar oluşturuluyor...');
    const thisMonday = monday(0);
    const lastMonday = monday(-1);
    const nextMonday = monday(1);

    type ShiftDef = {
        email: string;
        week: Date;
        day: number;
        startH: number;
        endH: number;
        status: ShiftStatus;
        note?: string;
    };

    const shiftDefs: ShiftDef[] = [
        /* ─── This week: 7 days, multiple employees ─── */
        // Pazartesi
        { email: 'employee@test.local', week: thisMonday, day: 0, startH: 8, endH: 16, status: 'ACKNOWLEDGED', note: 'Sabah açılış' },
        { email: 'zeynep@test.local', week: thisMonday, day: 0, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'can@test.local', week: thisMonday, day: 0, startH: 12, endH: 20, status: 'PUBLISHED', note: 'Öğle vardiyası' },
        { email: 'ayse@test.local', week: thisMonday, day: 0, startH: 7, endH: 15, status: 'ACKNOWLEDGED' },
        { email: 'burak@test.local', week: thisMonday, day: 0, startH: 10, endH: 18, status: 'PUBLISHED' },
        // Salı
        { email: 'employee@test.local', week: thisMonday, day: 1, startH: 12, endH: 20, status: 'PUBLISHED', note: 'Akşam yoğunluk' },
        { email: 'selin@test.local', week: thisMonday, day: 1, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'emre@test.local', week: thisMonday, day: 1, startH: 10, endH: 18, status: 'PUBLISHED' },
        { email: 'ali@test.local', week: thisMonday, day: 1, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        // Çarşamba
        { email: 'zeynep@test.local', week: thisMonday, day: 2, startH: 8, endH: 16, status: 'PUBLISHED' },
        { email: 'can@test.local', week: thisMonday, day: 2, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'deniz@test.local', week: thisMonday, day: 2, startH: 12, endH: 20, status: 'PUBLISHED', note: 'İkinci kasa' },
        { email: 'burak@test.local', week: thisMonday, day: 2, startH: 7, endH: 15, status: 'ACKNOWLEDGED' },
        { email: 'ayse@test.local', week: thisMonday, day: 2, startH: 10, endH: 18, status: 'PUBLISHED' },
        // Perşembe
        { email: 'employee@test.local', week: thisMonday, day: 3, startH: 8, endH: 16, status: 'PUBLISHED' },
        { email: 'selin@test.local', week: thisMonday, day: 3, startH: 12, endH: 20, status: 'DRAFT', note: 'Taslak — onay bekliyor' },
        { email: 'emre@test.local', week: thisMonday, day: 3, startH: 8, endH: 16, status: 'PUBLISHED' },
        { email: 'ali@test.local', week: thisMonday, day: 3, startH: 10, endH: 18, status: 'PUBLISHED' },
        // Cuma
        { email: 'employee@test.local', week: thisMonday, day: 4, startH: 12, endH: 22, status: 'PUBLISHED', note: 'Cuma akşamı uzun vardiya' },
        { email: 'zeynep@test.local', week: thisMonday, day: 4, startH: 8, endH: 16, status: 'PUBLISHED' },
        { email: 'can@test.local', week: thisMonday, day: 4, startH: 14, endH: 22, status: 'PUBLISHED' },
        { email: 'burak@test.local', week: thisMonday, day: 4, startH: 8, endH: 18, status: 'ACKNOWLEDGED', note: 'Fazla mesai — cuma yoğunluk' },
        { email: 'deniz@test.local', week: thisMonday, day: 4, startH: 8, endH: 16, status: 'PUBLISHED' },
        // Cumartesi
        { email: 'employee@test.local', week: thisMonday, day: 5, startH: 9, endH: 17, status: 'DRAFT' },
        { email: 'selin@test.local', week: thisMonday, day: 5, startH: 9, endH: 17, status: 'DRAFT' },
        { email: 'ayse@test.local', week: thisMonday, day: 5, startH: 8, endH: 18, status: 'DRAFT', note: 'Hafta sonu mutfak' },
        { email: 'emre@test.local', week: thisMonday, day: 5, startH: 10, endH: 20, status: 'DRAFT' },
        // Pazar
        { email: 'can@test.local', week: thisMonday, day: 6, startH: 10, endH: 18, status: 'DRAFT' },
        { email: 'zeynep@test.local', week: thisMonday, day: 6, startH: 10, endH: 18, status: 'DRAFT' },
        { email: 'burak@test.local', week: thisMonday, day: 6, startH: 9, endH: 17, status: 'DRAFT', note: 'Brunch menüsü' },

        /* ─── Last week: all acknowledged ─── */
        { email: 'employee@test.local', week: lastMonday, day: 0, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'employee@test.local', week: lastMonday, day: 1, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'employee@test.local', week: lastMonday, day: 2, startH: 12, endH: 20, status: 'ACKNOWLEDGED' },
        { email: 'employee@test.local', week: lastMonday, day: 4, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'zeynep@test.local', week: lastMonday, day: 0, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'zeynep@test.local', week: lastMonday, day: 2, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'zeynep@test.local', week: lastMonday, day: 3, startH: 12, endH: 20, status: 'ACKNOWLEDGED' },
        { email: 'can@test.local', week: lastMonday, day: 1, startH: 10, endH: 18, status: 'ACKNOWLEDGED' },
        { email: 'can@test.local', week: lastMonday, day: 3, startH: 10, endH: 18, status: 'ACKNOWLEDGED' },
        { email: 'can@test.local', week: lastMonday, day: 5, startH: 10, endH: 18, status: 'ACKNOWLEDGED' },
        { email: 'ayse@test.local', week: lastMonday, day: 0, startH: 7, endH: 15, status: 'ACKNOWLEDGED' },
        { email: 'ayse@test.local', week: lastMonday, day: 1, startH: 7, endH: 15, status: 'ACKNOWLEDGED' },
        { email: 'ayse@test.local', week: lastMonday, day: 3, startH: 7, endH: 15, status: 'ACKNOWLEDGED' },
        { email: 'burak@test.local', week: lastMonday, day: 0, startH: 10, endH: 18, status: 'ACKNOWLEDGED' },
        { email: 'burak@test.local', week: lastMonday, day: 2, startH: 10, endH: 18, status: 'ACKNOWLEDGED' },
        { email: 'burak@test.local', week: lastMonday, day: 4, startH: 10, endH: 20, status: 'ACKNOWLEDGED' },
        { email: 'selin@test.local', week: lastMonday, day: 1, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'selin@test.local', week: lastMonday, day: 3, startH: 8, endH: 16, status: 'ACKNOWLEDGED' },
        { email: 'emre@test.local', week: lastMonday, day: 0, startH: 12, endH: 20, status: 'ACKNOWLEDGED' },
        { email: 'emre@test.local', week: lastMonday, day: 2, startH: 12, endH: 20, status: 'ACKNOWLEDGED' },

        /* ─── Next week: drafts ─── */
        { email: 'employee@test.local', week: nextMonday, day: 0, startH: 8, endH: 16, status: 'DRAFT' },
        { email: 'employee@test.local', week: nextMonday, day: 2, startH: 12, endH: 20, status: 'DRAFT' },
        { email: 'employee@test.local', week: nextMonday, day: 4, startH: 8, endH: 16, status: 'DRAFT' },
        { email: 'zeynep@test.local', week: nextMonday, day: 1, startH: 8, endH: 16, status: 'DRAFT' },
        { email: 'zeynep@test.local', week: nextMonday, day: 3, startH: 8, endH: 16, status: 'DRAFT' },
        { email: 'can@test.local', week: nextMonday, day: 0, startH: 12, endH: 20, status: 'DRAFT' },
        { email: 'can@test.local', week: nextMonday, day: 2, startH: 12, endH: 20, status: 'DRAFT' },
        { email: 'ayse@test.local', week: nextMonday, day: 0, startH: 7, endH: 15, status: 'DRAFT' },
        { email: 'ayse@test.local', week: nextMonday, day: 1, startH: 7, endH: 15, status: 'DRAFT' },
        { email: 'burak@test.local', week: nextMonday, day: 0, startH: 10, endH: 18, status: 'DRAFT' },
        { email: 'burak@test.local', week: nextMonday, day: 3, startH: 10, endH: 18, status: 'DRAFT' }
    ];

    let shiftCount = 0;
    for (const s of shiftDefs) {
        const eid = employeeMap[s.email];
        if (!eid) continue;
        await prisma.shift.create({
            data: {
                employeeId: eid,
                startTime: shiftTime(s.week, s.day, s.startH),
                endTime: shiftTime(s.week, s.day, s.endH),
                status: s.status,
                note: s.note ?? null
            }
        });
        shiftCount++;
    }
    console.log(`  ✅ ${shiftCount} vardiya oluşturuldu (geçen hafta + bu hafta + gelecek hafta)`);

    /* ─── Availability ─── */
    console.log('\n🕐 Müsaitlik blokları oluşturuluyor...');
    type AvailDef = { email: string; type: AvailabilityType; dayOfWeek: number; startTime?: string; endTime?: string; note?: string };
    const availDefs: AvailDef[] = [
        // Mehmet: Pazar müsait değil, Cumartesi öğleden sonra tercih etmez
        { email: 'employee@test.local', type: 'UNAVAILABLE', dayOfWeek: 0, note: 'Pazar izin' },
        { email: 'employee@test.local', type: 'PREFER_NOT', dayOfWeek: 6, startTime: '14:00', endTime: '22:00', note: 'Cumartesi akşam tercih etmem' },
        // Zeynep: Çarşamba müsait değil (kurs)
        { email: 'zeynep@test.local', type: 'UNAVAILABLE', dayOfWeek: 3, note: 'Üniversite kursu' },
        { email: 'zeynep@test.local', type: 'PREFER_NOT', dayOfWeek: 0, startTime: '08:00', endTime: '12:00', note: 'Pazar sabah istemem' },
        // Can: Pazartesi müsait değil
        { email: 'can@test.local', type: 'UNAVAILABLE', dayOfWeek: 1, note: 'Pazartesi izin' },
        { email: 'can@test.local', type: 'AVAILABLE_ONLY', dayOfWeek: 5, startTime: '10:00', endTime: '18:00', note: 'Cuma sadece gündüz' },
        // Ayşe: Pazar müsait değil
        { email: 'ayse@test.local', type: 'UNAVAILABLE', dayOfWeek: 0, note: 'Pazar aile günü' },
        // Burak: Salı sabah müsait değil
        { email: 'burak@test.local', type: 'PREFER_NOT', dayOfWeek: 2, startTime: '06:00', endTime: '10:00', note: 'Salı sabah doktor' },
        // Selin: Cumartesi-Pazar müsait değil
        { email: 'selin@test.local', type: 'UNAVAILABLE', dayOfWeek: 6, note: 'Hafta sonu müsait değil' },
        { email: 'selin@test.local', type: 'UNAVAILABLE', dayOfWeek: 0, note: 'Hafta sonu müsait değil' },
        // Emre: Cuma gece çalışamaz
        { email: 'emre@test.local', type: 'PREFER_NOT', dayOfWeek: 5, startTime: '18:00', endTime: '23:00', note: 'Cuma akşam randevum var' },
        // Ali: Pazartesi ve Salı müsait değil
        { email: 'ali@test.local', type: 'UNAVAILABLE', dayOfWeek: 1, note: 'Pazartesi okul' },
        { email: 'ali@test.local', type: 'UNAVAILABLE', dayOfWeek: 2, note: 'Salı okul' },
        // Deniz: Sabahçı, akşam çalışmaz
        { email: 'deniz@test.local', type: 'AVAILABLE_ONLY', dayOfWeek: 1, startTime: '07:00', endTime: '16:00', note: 'Sadece sabah vardiyası' },
        { email: 'deniz@test.local', type: 'AVAILABLE_ONLY', dayOfWeek: 3, startTime: '07:00', endTime: '16:00' },
        { email: 'deniz@test.local', type: 'UNAVAILABLE', dayOfWeek: 0, note: 'Pazar müsait değil' }
    ];

    let availCount = 0;
    for (const a of availDefs) {
        const eid = employeeMap[a.email];
        if (!eid) continue;
        await prisma.availabilityBlock.create({
            data: {
                employeeId: eid,
                type: a.type,
                dayOfWeek: a.dayOfWeek,
                startTime: a.startTime ?? null,
                endTime: a.endTime ?? null,
                note: a.note ?? null,
                startDate: lastMonday,
                endDate: new Date(Date.UTC(2026, 11, 31))
            }
        });
        availCount++;
    }
    console.log(`  ✅ ${availCount} müsaitlik bloğu oluşturuldu`);

    console.log('\n🏝️ İzin türleri ve bakiyeleri oluşturuluyor...');
    // Create standard leave types
    await prisma.leaveType.createMany({
        data: [
            { code: 'ANNUAL', name: 'Yıllık İzin', isPaid: true, annualEntitlementDays: 14 },
            { code: 'SICK', name: 'Hastalık İzni', isPaid: true, requiresDocument: true },
            { code: 'UNPAID', name: 'Ücretsiz İzin', isPaid: false },
            { code: 'OTHER', name: 'Diğer', isPaid: true }
        ],
        skipDuplicates: true
    });

    const currentYear = new Date().getFullYear();
    const workdayMinutes = 8 * 60; // 480 minutes 
    let balanceCount = 0;

    for (const email of Object.keys(employeeMap)) {
        const eid = employeeMap[email];
        await prisma.leaveBalance.upsert({
            where: {
                employeeId_leaveCode_periodYear: { employeeId: eid, leaveCode: 'ANNUAL', periodYear: currentYear }
            },
            update: {},
            create: {
                employeeId: eid,
                leaveCode: 'ANNUAL',
                periodYear: currentYear,
                accruedMinutes: 14 * workdayMinutes
            }
        });
        balanceCount++;
    }
    console.log(`  ✅ İzin türleri ve ${balanceCount} çalışanın izin bakiyesi oluşturuldu`);

    console.log('\n🎉 Seed tamamlandı!');
    console.log(`   ${accounts.length} kullanıcı, ${shiftCount} vardiya, ${availCount} müsaitlik, ${balanceCount} izin bakiyesi`);
    console.log('   Tüm hesapların şifresi: Test12345!');
}

seed()
    .catch((e) => {
        console.error('Seed hatası:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

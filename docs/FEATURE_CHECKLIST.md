# CampusHub feature checklist

Status key: **done** = API + UI + tests or seeded demo path; **partial** = core path works, extras optional.

| Area | Status | Notes |
| --- | --- | --- |
| Auth, JWT, bcrypt, profiles, password reset | done | Automated in `tests/auth.test.js` |
| RBAC + department isolation | done | `tests/rbac.test.js` |
| Role dashboards | done | Live `/api/dashboard` |
| Leave | done | Overlap validation tested |
| Issues / complaints | done | Attachments + status history |
| Document requests | done | Authenticated file download |
| Academic resources | done | Upload/download via `/api/files` |
| Attendance | done | Unique student/subject/date |
| Timetable + calendar | done | Create/edit slots, department from subject, faculty/room conflict checks |
| Marks / exams | done | Unpublished hidden from students |
| Assignments | done | PDF/Office/presentation attachments, student submit, grade/late flag |
| Events + announcements | done | Capacity + duplicate registration |
| Notifications + email service | done | In-app + SMTP or console fallback |
| Search / filter / pagination | done | List endpoints |
| Analytics + audit | done | Chart.js + `/api/audit` |
| Placements | done | Eligibility + officer-only publish |
| Career / resumes | done | Versioned private uploads |
| Scholarships | done | Apply + review |
| Clubs | done | Membership workflow |
| Achievements | done | Faculty/admin verify |
| Polls | done | Duplicate + anonymous option |
| Digital ID + QR verify | done | Signed token, no extra PII in verify |
| Library | done | Issue/return/reserve |
| Hostel | done | Apply + allocate |
| Transport | done | Routes only, no fake GPS |
| FAQ + support tickets | done | Seeded FAQs |
| Assistant | done | Rule-based, optional AI key unused by default |
| Reminders | done | Interval job (disabled in tests) |
| Admin configuration | done | Departments, regulation-scoped subjects, settings; PVPSIT PVP-23 engineering and PVP-21 MBA curricula loaded |
| PWA | done | Manifest + SW; APIs not cached |
| Security headers, rate limit, CORS | done | Helmet + express-rate-limit |
| Docs + `.env.example` | done | README |
| CSV reports | done | Attendance + audit |
| Push notifications | done | Opt-in browser subscriptions, VAPID delivery, expired endpoint cleanup |
| Object storage (S3) | done | Optional S3-compatible adapter; local disk remains the default |
| PDF export | done | Attendance PDF and audit PDF alongside CSV |
| Native iOS/Android apps | n/a | PWA first, as specified |

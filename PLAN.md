# Redrive: ملف المشروع (الحالة والخطة)

آخر تحديث: 2026-11-07. الريبو: https://github.com/omarShujaeih/REdrive- (فرع `main`)
الديمو: https://redrive-demo.onrender.com (يتحدّث من فرع `demo`)

## 1. فكرة المشروع
منصة لتأجير السيارات في فلسطين. المستأجر يبحث عن سيارة، يحجز بالساعة، يدفع أونلاين، والشركة توافق. Redrive وسيط فقط: العمولة 10% من حصة الشركة، والعقد يتوقّع عند الشركة.

## 2. التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| الواجهة | React 19، Vite 8، React Router 7، socket.io-client، @stripe/stripe-js |
| السيرفر | Node 22، Express 5، Mongoose 9، socket.io، JWT، bcryptjs، multer، nodemailer، stripe |
| قاعدة البيانات | MongoDB (Atlas في الإنتاج، أو mongodb-memory-server للتجربة مع بيانات seed) |
| الدفع | Stripe (بمفتاح test)، أو محاكاة داخلية إذا ما في مفتاح |
| الخريطة | Google Maps JavaScript API (اختياري) |
| التوقع بالسعر | نموذج انحدار خطي مدرّب بـ Python (`ml/train_price_model.py`) وبيتصدّر لـ `ml/price_model.json` |
| الإشعارات | داخل التطبيق + socket.io فورياً، وإيميل (SMTP) و SMS (Twilio) اختياريين |
| النشر | Render Blueprint (`render.yaml`): سيرفر واحد يخدم الواجهة المبنية والـ API |
| الخطوط والتصميم | Readex Pro و Archivo (Google Fonts)، ألوان كحلية من شعار Redrive |

## 3. هيكل الريبو

```
redrive/
├── README.md                 التشغيل والمتغيرات وحسابات التجربة
├── PLAN.md                   هذا الملف
├── render.yaml               تعريف خدمة الديمو على Render
├── ml/
│   ├── train_price_model.py  تدريب نموذج السعر
│   └── price_model.json      المعاملات المصدّرة
├── server/
│   ├── src/
│   │   ├── index.js          نقطة الدخول: Express، socket.io، الواجهة المبنية، /api/policies
│   │   ├── config.js         كل أرقام السياسات (rules) ومفاتيح البيئة
│   │   ├── seed.js           بيانات التجربة (شركات، سيارات، مستأجرين، حجوزات نشطة ومتأخرة)
│   │   ├── middleware/       auth (JWT، الأدوار، التوثيق)، error، upload (multer)
│   │   ├── models/           User، Car، Rental (+ extensions)، Payment (kind: booking/extension/late_fee)، Review، Notification، VerificationCode، ChatMessage
│   │   ├── routes/           auth، cars، rentals، company، admin، notifications، chat
│   │   └── services/         payment، rentalActions، hours، availability، notify، price، db
│   └── uploads/seed/         صور استوديو للسيارات التجريبية + CREDITS.md
└── client/
    ├── src/
    │   ├── App.jsx           المسارات (عامة، مستأجر، شركة، أدمن)
    │   ├── auth.jsx          حالة الدخول، الإشعارات الفورية، useLiveRefresh
    │   ├── api.js            طلبات الـ API مع التوكن
    │   ├── labels.js         النصوص العربية، الحالات، الأوقات، الدوام
    │   ├── styles.css        كل التصميم (التوكنات، الأقسام، البوابات، الجداول على التلفون)
    │   ├── components/       Layout (الهيدر، الفوتر، البوابات، Side)، ui، AuthShell، Calendar،
    │   │                     CarDetails helpers، Hours، Policies (شروط)، RentalActions (تمديد، رسوم تأخير، إلغاء، تقييم)،
    │   │                     StripePay، LocationField، MapView، HeroFleet، Reveal
    │   └── pages/
    │       ├── Home، Search، CarDetails، Checkout، MyRentals، RentalDetails، Favorites،
    │       │   Notifications، Profile، Assistant، CompanyProfile، Terms، Login، Register، ForgotPassword
    │       ├── company/      Dashboard، Cars، CarForm، Requests، Rentals، RentalDetail، Finance، RenterProfile
    │       └── admin/        Dashboard، Verify، Cars، Users
    └── public/favicon.svg
```

عدد الملفات المتتبّعة في git: 108 (من غير صور seed والـ hero).

## 4. نماذج البيانات (الأهم)
- **User**: الأدوار (renter، company، admin)، حالة التوثيق، الوثائق، `company.hours` (ساعات الدوام كل يوم)، `company.location` (lat/lng)، المفضلة.
- **Car**: المواصفات، السعر اليومي، فترة التوفر، أيام مسكّرة، `pickupLocation` (عنوان + إحداثيات)، الصور، الوثائق، حالة الاعتماد.
- **Rental**: التواريخ بالساعة، الأيام (كل 24 ساعة يوم)، الحالة (pending، confirmed، active، completed، rejected، cancelled، no_show)، `extensions[]`، `returnedAt`، `lateDays`، `lateFee`، شروط الموافقة (termsVersion).
- **Payment**: النوع (booking، extension، late_fee)، المبلغ، الحالة (due، held، transferred، refunded، partially_refunded)، العمولة، مرجع البوابة.

## 5. الـ API (كل المسارات تحت `/api`)
- `/auth`: register، verify-phone، verify-email، resend-code، documents، login، forgot/reset-password، me (GET/PATCH: الاسم، المدينة، ساعات الدوام، عنوان الشركة، الموقع)، change-password.
- `/cars`: البحث، التفاصيل، المفضلة، سياراتي، إضافة/تعديل/حذف، تقدير السعر، صفحة الشركة.
- `/rentals`: payment-mode، payment-intent (حجز)، إنشاء الحجز، mine، تفاصيل، accept/reject/cancel/pickup/no-show/return، late-fee (intent + pay)، extensions (intent + طلب + موافقة + رفض)، review.
- `/company`: dashboard، finance، renters/:id.
- `/admin`: dashboard، verifications، cars، users (إضافة، حظر، حذف).
- `/notifications`، `/chat`، `/policies`، `/health`.

## 6. ما تم إنجازه

### الميزات
- حجز بالساعة. كل 24 ساعة يوم، وأي جزء من يوم يوم كامل.
- دوام الفرع: الاستلام والتسليم ضمن ساعات الشركة بتوقيت فلسطين (`Asia/Hebron`)، والشركة تحدد دوامها بنفسها.
- رسوم التأخير: ساعة سماح، وبعدها كل 24 ساعة يوم كامل. الشركة تسجّل وقت الإرجاع، والمستأجر يدفع الرسوم.
- طلبات التمديد: قبل 12 ساعة من التسليم، تُدفع وتُحجز، والشركة توافق أو ترفض (المبلغ بيرجع إذا رفضت أو ما ردّت).
- شروط وسياسات تظهر قبل الدفع، وتُحفظ نسختها مع الحجز.
- الدفع: Stripe حقيقي (بمفتاح test) للحجز والتمديد ورسوم التأخير، أو محاكاة إذا ما في مفتاح. البطاقة 4242 تنجح، والمنتهية بـ 0002 تُرفض. إذا الطلب انرفض بعد ما انخصمت البطاقة، المبلغ بيرجع تلقائياً.
- عنوان الشركة وموقع الفرع على الخريطة (يدوي، أو من الجهاز، أو موقع الشركة)، وموقع كل سيارة.
- إشعارات فورية (socket.io) والصفحات بتتحدث لحالها بدون ريلود.
- إضافة مستخدم من الأدمن (تُرسل إيميل لتعيين كلمة مرور).
- شريط للمستأجر اللي حسابه مش موثّق أو مرفوض أو تحت المراجعة.

### التصميم
- نظام تصميم كامل بالكحلي من الشعار، الواجهة العامة والمستأجر والشركة والأدمن.
- الهوم والدخول والتسجيل وكلمة المرور والبحث وتفاصيل السيارة والدفع والحجوزات وتفاصيل الحجز والمفضلة والإشعارات والملف الشخصي والمساعد وصفحة الشركة.
- لوحات الشركة والأدمن: قائمة جانبية كحلية، بطاقات أرقام، جداول تصير كروت على التلفون، ونوافذ ومراجعة بتنقسم بعمودين على الكمبيوتر وبعمود على التلفون.
- اختبارات على 1280 بكسل و 375 بكسل: ما في سكرول أفقي.

### الفروع (كلها على الريبو)

| الفرع | آخر commit | المحتوى |
|---|---|---|
| `main` | `a0a7919` | كل الشغل (تم الدمج بطلب عمر، بدون PR مراجعة) |
| `feature/hourly-rentals` | `a31a9ff` | الإيجار بالساعة، التأخير، التمديد، الشروط، دوام الفروع |
| `frontend/renter-journey` | `ca007ea` | تصميم رحلة المستأجر |
| `feature/stripe-extras` | `2bd0e4b` | Stripe للتمديد ورسوم التأخير، عنوان وموقع الشركة |
| `frontend/portals` | `97dcd97` | تصميم بوابة الشركة والأدمن |
| `frontend/ux-gaps` | `a0a7919` | التحديث المباشر، صور السيارة وموقعها، الشريط، إضافة مستخدم، الخريطة |
| `demo` | `a0a7919` | يُنشر تلقائياً على Render |

### الاختبارات والتحقق
- بناء الواجهة ينجح، واللينتر: صفر أخطاء، وتحذير واحد في `MapView.jsx`.
- نجحت: `flow-test2` (التأخير والتمديد والرفض)، `hours-test` (الدوام)، `extras-test` (Stripe وعنوان الشركة)، `late-unit`، `gaps-test` (صور السيارة والموقع، التسجيل، إضافة مستخدم)، و`live-test` (7 من 7 في المتصفح الحي).
- **فاشل:** `flow-test.mjs`. أوقاته مرتبطة بالساعة الحالية، فيقع الإرجاع خارج دوام الفرع. الشغل نفسه يمر في الاختبارات الأخرى.
- **ملاحظة:** سكربتات الاختبار (`flow-test`، `hours-test`، `live-test`...) موجودة في مجلد الـ scratchpad خارج الريبو، مش داخل `git`. لازم تنقل للريبو أو تتوثّق.

## 7. ما ضل (مرتّب حسب الأولوية)

### حاجز (يوقف الإنهاء)
1. **الديمو ما زال يخدم النسخة القديمة** (`index-5Kp2Rc6V.js`). النسخة الحالية `index-Dguyk2tj.js`. لازم نتأكد من الـ deploy في Render dashboard. الدليل: `/api/health` = 200 والصفحة تخدم الـ bundle الجديد.
2. **مراجعة الباك على `main`**. الباك دخل `main` بدون PR بطلب من عمر. التيم يراجع: `005f516`، `47296ee`، `a31a9ff`، `2bd0e4b`.

### مهم للإطلاق الحقيقي
3. **MongoDB Atlas على Render** (`MONGO_URI`)، مع مستخدم قاعدة بيانات خاص بالتطبيق. كلمة السر القديمة (اللي انشاركت) لازم تتغيّر.
4. **مفاتيح Stripe test** (`STRIPE_SECRET_KEY` و `VITE_STRIPE_PUBLISHABLE_KEY`) ومراجعة الدفع الحقيقي: حجز، تمديد، رسوم تأخير، ورفض 0002.
5. **تحويل أرباح الشركات**: حالياً بتتسجّل على المنصة فقط، لأن Stripe Connect غير متاح لتجار فلسطين. لازم قرار: تحويل يدوي؟ ولازم يُذكر في الديمو.

### تحسينات (اختيارية)
6. مفتاح Google Maps (`VITE_GOOGLE_MAPS_KEY`). بدونه الخريطة تعرض رسالة بديلة.
7. SMTP و Twilio. بدونهم الإيميلات والـ SMS تُطبع على الكونسول.
8. نقل سكربتات الاختبار للريبو، وإعادة كتابة `flow-test.mjs` بتواريخ ثابتة.
9. المساعد الذكي حالياً قواعد جاهزة (بدون نموذج لغوي). الكود مجهّز ليتبدّل بدون تغيير الـ API.
10. صور لوحات Redrive على كروت السيارات (اختياري).

### توثيق
11. تحديث `README.md`: خطوات التشغيل، المتغيرات، حسابات التجربة (كلمة السر `Test1234!` للتجربة فقط)، أرقام البطاقات التجريبية.
12. تحديث ملف الحالة في Claude Docs (https://claude.ai/artifact/XEyxL3qd9fmZETUGiXtbR1) بالدمج والحالة النهائية.

## 8. تشغيل محلي
```bash
cd server && npm install && npm run dev     # API على http://localhost:5050
cd client && npm install && npm run dev     # الواجهة على http://localhost:5173
```
بدون `MONGO_URI` السيرفر يشغّل MongoDB بالذاكرة ويعبّي بيانات التجربة (تنمسح عند كل إعادة تشغيل).

حسابات التجربة (كلمة السر `Test1234!`): `omar@redrive.ps` (مستأجر)، `layan@redrive.ps` (مستأجر، عنده تأخير)، `riyada@redrive.ps` و`najma@redrive.ps` و`sahel@redrive.ps` (شركات)، `admin@redrive.ps` (أدمن).

## 9. الإنشاء على Render (الديمو)
- `render.yaml` يعرّف خدمة `redrive-demo` على الخطة المجانية، فرع `demo`، والـ health check على `/api/health`.
- بناء: `npm ci --prefix client && npm run build --prefix client && npm ci --prefix server`. تشغيل: `npm start --prefix server`.
- التحديث: أي push على `demo` يبني وينشر تلقائياً. الخطة المجانية تنام بعد 15 دقيقة بدون زيارات، وأول فتحة بعدها تأخذ حوالي 50 ثانية، وكل بيانات الديمو تُعاد لوضعها الأولي.

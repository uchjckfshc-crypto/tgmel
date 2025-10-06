// firebase-sync.js

// ----------------------------------------------------
// استيراد Firebase SDK
// ----------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ----------------------------------------------------
// إعدادات Firebase الخاصة بك
// ----------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBBbPD0x8453Bx2bXPrpI66S5YvK479iGI",
    authDomain: "tiyu-48c90.firebaseapp.com",
    projectId: "tiyu-48c90",
    storageBucket: "tiyu-48c90.firebasestorage.app",
    messagingSenderId: "698714199813",
    appId: "1:698714199813:web:6a33c41ff8cbc6fdf7896c",
    measurementId: "G-H6947ZMMB9"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app); 

// مراجع Firebase
const APPOINTMENTS_REF = ref(database, 'appointments');
const SERVICES_REF = ref(database, 'services');         

// مفاتيح localStorage التي يستخدمها السكريبت الرئيسي
const LOCAL_APPOINTMENTS_KEY = 'appointments';
const LOCAL_SERVICES_KEY = 'services';
const DEFAULT_SERVICES = ['شعر', 'بشرة', 'أظافر', 'مكياج']; // يجب أن تتطابق مع الافتراضية في index.html

// ----------------------------------------------------
// دوال مساعدة لـ localStorage (للاستخدام الداخلي لهذا السكريبت)
// ----------------------------------------------------
function getLocalAppointments() {
    const json = localStorage.getItem(LOCAL_APPOINTMENTS_KEY);
    return json ? JSON.parse(json) : [];
}

function setLocalAppointments(appointments) {
    localStorage.setItem(LOCAL_APPOINTMENTS_KEY, JSON.stringify(appointments));
    window.dispatchEvent(new Event('localStorageUpdated')); // لإعلام السكريبت الرئيسي بالتحديث
}

function getLocalServices() {
    const json = localStorage.getItem(LOCAL_SERVICES_KEY);
    return json ? JSON.parse(json) : DEFAULT_SERVICES; 
}

function setLocalServices(services) {
    localStorage.setItem(LOCAL_SERVICES_KEY, JSON.stringify(services));
    window.dispatchEvent(new Event('localStorageUpdated')); // لإعلام السكريبت الرئيسي بالتحديث
}

// ----------------------------------------------------
// وظيفة مزامنة البيانات من Firebase إلى localStorage (الاستماع للتغييرات في Firebase)
// ----------------------------------------------------
function listenAndSyncFirebaseToLocalStorage() {
    // الاستماع لتغييرات المواعيد في Firebase
    onValue(APPOINTMENTS_REF, (snapshot) => {
        const firebaseData = snapshot.val();
        let appointmentsArray = [];
        if (firebaseData) {
            // تحويل الكائن من Firebase إلى مصفوفة (مع الاحتفاظ بالمفتاح كـ id)
            appointmentsArray = Object.keys(firebaseData).map(key => ({
                id: key,
                ...firebaseData[key]
            }));
        }
        console.log("Firebase -> LocalStorage: Appointments updated.");
        setLocalAppointments(appointmentsArray); // ستقوم بإطلاق حدث 'localStorageUpdated'
    });

    // الاستماع لتغييرات الخدمات في Firebase
    onValue(SERVICES_REF, (snapshot) => {
        const firebaseServices = snapshot.val();
        // إذا كانت Firebase فارغة، ادفع الخدمات الافتراضية أو المحلية الموجودة
        if (!firebaseServices) {
            const localServices = getLocalServices();
            if (localServices.length > 0 && localServices.toString() !== DEFAULT_SERVICES.toString()) {
                 set(SERVICES_REF, localServices); // ادفع الخدمات المحلية الموجودة
                 console.log("LocalStorage -> Firebase: Initial services pushed.");
            } else {
                 set(SERVICES_REF, DEFAULT_SERVICES); // ادفع الخدمات الافتراضية
                 console.log("Firebase initialized with default services.");
            }
            setLocalServices(firebaseServices || DEFAULT_SERVICES); // تأكد من وجود شيء في localStorage
            return;
        }

        console.log("Firebase -> LocalStorage: Services updated.");
        setLocalServices(firebaseServices); // ستقوم بإطلاق حدث 'localStorageUpdated'
    });
}

// ----------------------------------------------------
// وظائف لدفع البيانات من localStorage إلى Firebase (تُستدعى من السكريبت الرئيسي)
// ----------------------------------------------------
// وظيفة لدفع المواعيد من localStorage إلى Firebase
export function pushAppointmentsToFirebase() {
    const localAppointments = getLocalAppointments();
    const firebaseObject = localAppointments.reduce((obj, item) => {
        const { id, ...rest } = item;
        if (id) { // تأكد من وجود ID
            obj[id] = rest; // Firebase تتوقع كائن، لا مصفوفة مباشرة، والمفتاح هو الـ ID
        }
        return obj;
    }, {});
    set(APPOINTMENTS_REF, firebaseObject)
        .then(() => console.log("LocalStorage -> Firebase: Appointments pushed."))
        .catch(error => console.error("Error pushing appointments to Firebase:", error));
}

// وظيفة لدفع الخدمات من localStorage إلى Firebase
export function pushServicesToFirebase() {
    const localServices = getLocalServices();
    set(SERVICES_REF, localServices)
        .then(() => console.log("LocalStorage -> Firebase: Services pushed."))
        .catch(error => console.error("Error pushing services to Firebase:", error));
}


// ----------------------------------------------------
// بدء المزامنة عند تحميل الصفحة
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    listenAndSyncFirebaseToLocalStorage(); // ابدأ بسحب البيانات من Firebase إلى localStorage
    console.log("Firebase synchronization script loaded and running.");
});

// ----------------------------------------------------
// تصدير الدوال ليتمكن السكريبت الرئيسي من الوصول إليها
// ----------------------------------------------------
window.firebaseSync = {
    pushAppointmentsToFirebase: pushAppointmentsToFirebase,
    pushServicesToFirebase: pushServicesToFirebase
};
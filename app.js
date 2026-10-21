import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// KREDENSIAL FIREBASE EMBEDDED
const firebaseConfig = {
    apiKey: "AIzaSyBf4r0ZYllayZq8pvtxj00uz6DghMRjJtg",
    authDomain: "simulasi-mafia.firebaseapp.com",
    projectId: "simulasi-mafia",
    storageBucket: "simulasi-mafia.firebasestorage.app",
    messagingSenderId: "521663445985",
    appId: "1:521663445985:web:f77f967e7c40bd340c30a0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DATA WILAYAH INDONESIA
const PROVINCES = [
    { id: 'dki', name: 'DKI Jakarta', minPower: 0, cities: ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Utara', 'Jakarta Timur'] },
    { id: 'jabar', name: 'Jawa Barat', minPower: 150, cities: ['Bandung', 'Bekasi', 'Depok', 'Bogor', 'Cirebon', 'Sukabumi'] },
    { id: 'jateng', name: 'Jawa Tengah', minPower: 450, cities: ['Semarang', 'Solo', 'Magelang', 'Tegal', 'Pekalongan', 'Cilacap'] },
    { id: 'jatim', name: 'Jawa Timur', minPower: 900, cities: ['Surabaya', 'Malang', 'Kediri', 'Madiun', 'Banyuwangi', 'Probolinggo'] },
    { id: 'sumut', name: 'Sumatera Utara', minPower: 1800, cities: ['Medan', 'Pematangsiantar', 'Binjai', 'Tanjungbalai', 'Tebing Tinggi'] },
    { id: 'sulsel', name: 'Sulawesi Selatan', minPower: 3000, cities: ['Makassar', 'Palopo', 'Parepare', 'Toraja', 'Bone'] }
];

const GLOBAL_TARGETS = [
    { id: 'golden_triangle', name: 'Segitiga Emas Asia Tenggara', reqPower: 5000, rewardPerMin: 50000000 },
    { id: 'hongkong_triad', name: 'Pelabuhan Hong Kong', reqPower: 10000, rewardPerMin: 150000000 },
    { id: 'sydney_underworld', name: 'Jaringan Sydney - Australia', reqPower: 25000, rewardPerMin: 500000000 }
];

const RIVAL_NAMES = ['Geng Banteng Merah', 'Kartel Batavia', 'Ormas Pesisir', 'Mafia Port', 'Sindikat Hitam', 'Geng Kampung Atas'];

// AKSI KRIMINAL MANUAL
const CRIMES_DATA = [
    { id: 'parkir_liar', name: 'Pungli Parkir Liar', durationSec: 5, minMembers: 1, minPower: 0, reward: 500000, heat: 2 },
    { id: 'peras_pasar', name: 'Peras Pedagang Pasar', durationSec: 10, minMembers: 2, minPower: 20, reward: 2000000, heat: 5 },
    { id: 'begal', name: 'Begal Motor Malam', durationSec: 15, minMembers: 3, minPower: 50, reward: 6000000, heat: 8 },
    { id: 'judi_online', name: 'Markas Judi Online', durationSec: 25, minMembers: 5, minPower: 120, reward: 18000000, heat: 12 },
    { id: 'rampok_toko', name: 'Perampokan Toko Emas', durationSec: 40, minMembers: 8, minPower: 300, reward: 60000000, heat: 18 },
    { id: 'penyelundupan_bbm', name: 'Penyelundupan BBM Subsidi', durationSec: 60, minMembers: 12, minPower: 600, reward: 180000000, heat: 25 }
];

// BISNIS HARAM
const BUSINESS_DATA = [
    { id: 'warung_remang', name: 'Warung Remang-Remang', cost: 10000000, income: 300000 },
    { id: 'gelanggang_ayam', name: 'Arena Judi Sabung Ayam', cost: 45000000, income: 1500000 },
    { id: 'bengkel_pretelan', name: 'Bengkel Motor Pretelan', cost: 180000000, income: 6000000 },
    { id: 'club_malam', name: 'Diskotek & Bar Malam', cost: 750000000, income: 25000000 },
    { id: 'kasino_gelap', name: 'Kasino Gelap Bawah Tanah', cost: 3000000000, income: 100000000 }
];

// 10 JENIS MISI PENYELUNDUPAN (Revisi #7)
const ALL_EXPEDITION_MASTER = [
    { id: 'exp_1', name: 'Penyelundupan Ro-Ro Merak-Bakauheni', durationSec: 45, reward: 50000000, risk: 0.3, penaltyMoney: 15000000 },
    { id: 'exp_2', name: 'Kargo Kayu Ilegal Kalimantan', durationSec: 60, reward: 90000000, risk: 0.35, penaltyMoney: 25000000 },
    { id: 'exp_3', name: 'Penyelundupan Rokok Tanpa Cukai', durationSec: 75, reward: 130000000, risk: 0.4, penaltyMoney: 40000000 },
    { id: 'exp_4', name: 'Lalu Lintas Jalur Tikus Entikong', durationSec: 90, reward: 180000000, risk: 0.45, penaltyMoney: 55000000 },
    { id: 'exp:5', name: 'Kapal Feri Gelap Jawa-Sumatera', durationSec: 120, reward: 260000000, risk: 0.5, penaltyMoney: 80000000 },
    { id: 'exp_6', name: 'Kontainer Elektronik BM Tanjung Priok', durationSec: 150, reward: 350000000, risk: 0.52, penaltyMoney: 110000000 },
    { id: 'exp_7', name: 'Armada Minyak Mentah Pesisir', durationSec: 180, reward: 500000000, risk: 0.55, penaltyMoney: 150000000 },
    { id: 'exp_8', name: 'Penyelundupan Biji Nikel Gelap', durationSec: 240, reward: 750000000, risk: 0.6, penaltyMoney: 220000000 },
    { id: 'exp_9', name: 'Kapal Isap Timah Ilegal Bangka', durationSec: 300, reward: 1100000000, risk: 0.65, penaltyMoney: 350000000 },
    { id: 'exp_10', name: 'Kontainer Laut Lintas Pulau Sula', durationSec: 360, reward: 1800000000, risk: 0.7, penaltyMoney: 500000000 }
];

// PERWIRA UNIK / UNDERBOSS (Revisi #5)
const OFFICERS_MASTER = [
    { id: 'bambang_lintah', name: 'Bambang Lintah', title: 'Ahli Finansial', cost: 25000000, desc: 'Memotong gaji seluruh anak buah sebesar 20%.' },
    { id: 'akbp_hendro', name: 'AKBP Hendro (Korup)', title: 'Jalur Hukum', cost: 75000000, desc: 'Peningkatan Heat Level berkurang 30% dari aksi kriminal.' },
    { id: 'siti_mawar', name: 'Siti Mawar', title: 'Penyelundup Handal', cost: 150000000, desc: 'Risiko gagal pada seluruh ekspedisi berkurang 15%.' }
];

function createDefaultGameState() {
    return {
        setupDone: false,
        homeProvince: 'dki',
        homeCity: 'Jakarta Pusat',
        money: 5000000,
        weapons: 0,
        reputation: 0,
        heat: 0,
        isJailed: false,
        jailTimerSec: 0,
        members: [
            { id: Date.now() + 1, power: Math.floor(Math.random() * 5) + 1 },
            { id: Date.now() + 2, power: Math.floor(Math.random() * 5) + 1 }
        ],
        jailedMembers: [],
        officers: {}, // { 'bambang_lintah': true }
        businesses: {},
        controlledCities: {},
        controlledGlobal: {},
        activeExpedition: null,
        availableExpeditions: [], // Misi penyelundupan yang sedang muncul [{ id, expId, expireTime }]
        activeCrime: null // Hanya 1 aksi kriminal aktif [{ crimeId, endTime }] (Revisi #3)
    };
}

let currentUser = null;
let currentAuthMode = 'login';
let gameState = createDefaultGameState();

// TIMER UPDATE 1 MENIT
let payoutCountdownSec = 60;

// EVENT ACAK TIMER (5-10 MENIT & 20s LIMIT) (Revisi #8)
let currentActiveEvent = null;
let eventTimerSec = 20;

window.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    populateSetupSelects();

    setInterval(secondTicker, 1000);
    setInterval(cloudAutosave, 15000);
    
    // Rotasi Misi Penyelundupan
    rotateExpeditionMissions();
    setInterval(rotateExpeditionMissions, 45000); // Rotasi tiap 45 detik

    // Event Acak 5 - 10 Menit
    scheduleNextRandomEvent();
});

// AUTH SYSTEM
function setupAuthListeners() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            gameState = createDefaultGameState();

            document.getElementById('auth-modal').classList.add('hidden');
            await loadUserData();

            if (!gameState.setupDone) {
                document.getElementById('setup-modal').classList.remove('hidden');
                document.getElementById('game-container').classList.add('hidden');
            } else {
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('game-container').classList.remove('hidden');
                initUI();
            }
        } else {
            currentUser = null;
            gameState = createDefaultGameState();
            document.getElementById('auth-modal').classList.remove('hidden');
            document.getElementById('game-container').classList.add('hidden');
            document.getElementById('setup-modal').classList.add('hidden');
        }
    });
}

window.switchAuthTab = function(mode) {
    currentAuthMode = mode;
    document.getElementById('tab-login-btn').className = mode === 'login' ? 'active' : '';
    document.getElementById('tab-register-btn').className = mode === 'register' ? 'active' : '';
    document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'MASUK KE DUNIA HITAM' : 'DAFTAR AKUN BARU';
};

window.handleAuthSubmit = async function(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const errorEl = document.getElementById('auth-error');
    errorEl.innerText = "";

    const email = `${username.toLowerCase()}@mafia.local`;

    try {
        if (currentAuthMode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            gameState = createDefaultGameState();
            await createUserWithEmailAndPassword(auth, email, password);
            await cloudAutosave();
        }
    } catch (err) {
        errorEl.innerText = "Gagal Login/Daftar: " + err.message;
    }
};

window.logout = function() { signOut(auth); };

// SETUP AWAL WILAYAH
function populateSetupSelects() {
    const pSelect = document.getElementById('setup-province-select');
    if (!pSelect) return;
    pSelect.innerHTML = '';

    PROVINCES.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = p.name;
        pSelect.appendChild(opt);
    });
    onProvinceSelectChange();
}

window.onProvinceSelectChange = function() {
    const pSelect = document.getElementById('setup-province-select');
    const cSelect = document.getElementById('setup-city-select');
    const prov = PROVINCES.find(p => p.id === pSelect.value);
    cSelect.innerHTML = '';

    if (prov) {
        prov.cities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.innerText = c;
            cSelect.appendChild(opt);
        });
    }
};

window.submitInitialSetup = async function() {
    const pId = document.getElementById('setup-province-select').value;
    const cName = document.getElementById('setup-city-select').value;

    gameState.homeProvince = pId;
    gameState.homeCity = cName;
    gameState.controlledCities = {};
    gameState.controlledCities[cName] = true;
    gameState.setupDone = true;

    document.getElementById('setup-modal').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    await cloudAutosave();
    initUI();
    setAssistantMessage(`Selamat datang Boss! Basecamp berdiri di ${cName}, ${getProvinceObj(pId).name}.`);
};

// FIRESTORE SYNC
async function cloudAutosave() {
    if (!currentUser || !gameState.setupDone) return;
    try {
        await setDoc(doc(db, "users", currentUser.uid), gameState, { merge: true });
        logMessage("Autosave Cloud Firestore berhasil.", "success");
    } catch (err) { console.error("Autosave error:", err); }
}

async function loadUserData() {
    if (!currentUser) return;
    try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
            gameState = { ...createDefaultGameState(), ...docSnap.data() };
        }
    } catch (err) { console.error("Load error:", err); }
}

// TICKER UTAMA PER DETIK
function secondTicker() {
    if (!currentUser || !gameState.setupDone) return;

    payoutCountdownSec--;
    const timerEl = document.getElementById('stat-timer-60s');
    if (timerEl) timerEl.innerText = `${payoutCountdownSec}s`;

    if (payoutCountdownSec <= 0) {
        payoutCountdownSec = 60; // Reset ke 60 detik

        if (!gameState.isJailed) {
            const income = calculateTotalIncome1Min();
            const expenses = calculateTotalExpenses1Min();
            const net = income - expenses;

            gameState.money += net;

            // TURF REBELLION TICKER (Revisi #6)
            checkTurfRebellion();

            if (gameState.money < 0) {
                gameState.money = 0;
                if (gameState.members.length > 0 && Math.random() < 0.4) {
                    const removeCount = Math.min(gameState.members.length, Math.floor(Math.random() * 3) + 1);
                    for (let i = 0; i < removeCount; i++) gameState.members.pop();
                    setAssistantMessage(`Kas minus! ${removeCount} anak buah kabur karena gaji menunggak!`);
                    logMessage(`${removeCount} Anak buah kabur karena gaji minus!`, "danger");
                }
            }
        }
    }

    jailTicker();
    expeditionTicker();
    crimeSingleTicker();
    eventModalTimerTicker();
    updateUI();
}

function calculateTotalIncome1Min() {
    let income = 0;
    BUSINESS_DATA.forEach(b => {
        income += (gameState.businesses[b.id] || 0) * b.income;
    });

    const controlledCount = Object.keys(gameState.controlledCities).length;
    income += controlledCount * 1000000;

    GLOBAL_TARGETS.forEach(g => {
        if (gameState.controlledGlobal[g.id]) income += g.rewardPerMin;
    });

    return income;
}

function calculateTotalExpenses1Min() {
    let baseExpense = gameState.members.length * 150000;
    // Perwira Bambang Lintah: Potong gaji 20%
    if (gameState.officers['bambang_lintah']) baseExpense *= 0.8;
    return baseExpense;
}

function getPlayerTotalPower() {
    let pwr = gameState.weapons * 25;
    gameState.members.forEach(m => pwr += m.power);
    return pwr;
}

// UI RENDERING
function initUI() {
    populateProvinceViewSelect();
    renderCrimes();
    renderBusiness();
    renderOfficers();
    renderExpeditions();
    renderGlobalTargets();
    updateUI();
}

function updateUI() {
    if (!gameState.setupDone) return;

    document.getElementById('user-display-name').innerText = currentUser ? currentUser.email.split('@')[0] : 'Boss';
    document.getElementById('player-location-badge').innerText = `Basecamp: ${gameState.homeCity} (${getProvinceObj(gameState.homeProvince).name})`;

    const totalCities = Object.keys(gameState.controlledCities).length;
    const myPwr = getPlayerTotalPower();
    let rankTitle = "Preman Pasar";
    if (myPwr >= 3000 && totalCities >= 30) rankTitle = "Don Sindikat Indonesia";
    else if (myPwr >= 1500 && totalCities >= 15) rankTitle = "Ketua Kartel Lintas Pulau";
    else if (myPwr >= 450 && totalCities >= 6) rankTitle = "Bos Ormas Wilayah";
    else if (myPwr >= 150) rankTitle = "Kepala Keamanan Daerah";

    document.getElementById('player-title').innerText = rankTitle;

    const income = calculateTotalIncome1Min();
    const expenses = calculateTotalExpenses1Min();
    const net = income - expenses;

    document.getElementById('stat-money').innerText = `Rp ${gameState.money.toLocaleString('id-ID')}`;
    document.getElementById('stat-income').innerText = `+Rp ${income.toLocaleString('id-ID')}`;
    document.getElementById('stat-expenses').innerText = `-Rp ${expenses.toLocaleString('id-ID')}`;
    document.getElementById('stat-net').innerText = `${net >= 0 ? '+' : ''}Rp ${net.toLocaleString('id-ID')}`;
    document.getElementById('stat-net').className = `stat-value ${net >= 0 ? 'text-blue' : 'text-red'}`;

    document.getElementById('stat-members').innerText = `${gameState.members.length} Orang`;
    document.getElementById('stat-power').innerText = `${myPwr} PWR`;
    document.getElementById('stat-heat').innerText = `${gameState.heat}%`;
    document.getElementById('heat-bar').style.width = `${gameState.heat}%`;

    renderTurfMap();
    renderMembersList();
    renderJailedMembersList();
}

function setAssistantMessage(msg) {
    const el = document.getElementById('assistant-message');
    if (el) el.innerText = `"${msg}"`;
}

// NAVIGATION
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.target) event.target.classList.add('active');
};

// PETA WILAYAH & TURF REBELLION (Revisi #6)
function populateProvinceViewSelect() {
    const sel = document.getElementById('province-view-select');
    if (!sel) return;
    sel.innerHTML = '';
    PROVINCES.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = p.name;
        sel.appendChild(opt);
    });
    sel.value = gameState.homeProvince;
}

function renderTurfMap() {
    const grid = document.getElementById('turf-map-grid');
    const selProvId = document.getElementById('province-view-select') ? document.getElementById('province-view-select').value : gameState.homeProvince;
    const prov = getProvinceObj(selProvId);
    if (!grid || !prov) return;

    grid.innerHTML = '';

    const homeProvObj = getProvinceObj(gameState.homeProvince);
    const homeProvAllControlled = homeProvObj.cities.every(c => gameState.controlledCities[c]);

    const isLockedProv = (selProvId !== gameState.homeProvince) && (!homeProvAllControlled || getPlayerTotalPower() < prov.minPower);

    prov.cities.forEach(cityName => {
        const isControlled = gameState.controlledCities[cityName];
        const card = document.createElement('div');
        card.className = `turf-card ${isControlled ? 'controlled-player' : 'controlled-enemy'} ${isLockedProv ? 'locked' : ''}`;

        const rivalName = RIVAL_NAMES[Math.abs(hashCode(cityName)) % RIVAL_NAMES.length];

        card.innerHTML = `
            <h4>${cityName}</h4>
            <p style="font-size:0.85rem;">Status: <strong>${isControlled ? 'Tergeng Anda' : 'Dikuasai ' + rivalName}</strong></p>
            <p style="font-size:0.8rem; color:#8c96a5;">Bonus Kas: +Rp 1.000.000 / mnt</p>
            ${isControlled ? '<span class="text-green" style="font-size:0.85rem;">✔ Terkuasai</span>' : 
              isLockedProv ? `<small class="text-red">Kuasai seluruh ${homeProvObj.name} dulu! (Min${prov.minPower} PWR)</small>` :
              `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" onclick="reclaimCity('${cityName}', '${selProvId}')">Serang & Rebut Kota</button>`}
        `;
        grid.appendChild(card);
    });
}

window.reclaimCity = function(cityName, provId) {
    const prov = getProvinceObj(provId);
    const myPwr = getPlayerTotalPower();
    const reqPwr = prov.minPower + 50;

    if (myPwr < reqPwr) {
        alert(`Power Tempur Anda (${myPwr} PWR) kurang untuk merebut ${cityName}! Dibutuhkan minimal ${reqPwr} PWR.`);
        return;
    }

    if (Math.random() < 0.6) {
        gameState.controlledCities[cityName] = true;
        setAssistantMessage(`KABAR GEMBIRA BOSS! Kota ${cityName} berhasil ditaklukkan!`);
        logMessage(`BERHASIL! Menyerang dan menguasai kota ${cityName}!`, 'success');
    } else {
        removeRandomMembers(1, 3);
        setAssistantMessage(`Gagal merebut kota ${cityName}! Pertahanan musuh sangat kuat, beberapa pasukan gugur!`);
        logMessage(`GAGAL! Serangan ke ${cityName} dipukul mundur. Pasukan gugur.`, 'danger');
    }
    updateUI();
};

function checkTurfRebellion() {
    const controlledKeys = Object.keys(gameState.controlledCities);
    if (controlledKeys.length <= 1) return; // Basecamp aman

    if (Math.random() < 0.15) { // 15% peluang terjadi pergolakan per menit
        const rebelCity = controlledKeys[Math.floor(Math.random() * controlledKeys.length)];
        if (rebelCity !== gameState.homeCity) {
            delete gameState.controlledCities[rebelCity];
            setAssistantMessage(`PERINGATAN! Kota ${rebelCity} mengalami pemberontakan Ormas lokal dan terlepas dari kekuasaan Anda!`);
            logMessage(`PEMBERONTAKAN: Kota ${rebelCity} terlepas dari kekuasaan!`, 'danger');
        }
    }
}

// AKSI KRIMINAL KUNCI PROSES & COUNTDOWN (Revisi #3)
function renderCrimes() {
    const container = document.getElementById('crimes-list');
    if (!container) return;
    container.innerHTML = '';

    const hasActive = gameState.activeCrime !== null;

    CRIMES_DATA.forEach(c => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${c.name}</h4>
                <p>Durasi: ${c.durationSec}s | Syarat: Min ${c.minMembers} Pasukan, ${c.minPower} PWR</p>
                <p>Hasil: +Rp ${c.reward.toLocaleString('id-ID')} | Heat +${c.heat}%</p>
            </div>
            <button class="btn btn-gold" ${hasActive ? 'disabled' : ''} onclick="startCrime('${c.id}')">
                ${hasActive ? 'Aksi Lain Sedang Berjalan' : 'Eksekusi Aksi'}
            </button>
        `;
        container.appendChild(card);
    });
}

window.startCrime = function(crimeId) {
    if (gameState.isJailed) { alert("Anda sedang di dalam penjara!"); return; }
    if (gameState.activeCrime) { alert("Selesaikan aksi kriminal yang sedang berjalan terlebih dahulu!"); return; }

    const c = CRIMES_DATA.find(x => x.id === crimeId);
    if (!c) return;

    if (gameState.members.length < c.minMembers || getPlayerTotalPower() < c.minPower) {
        alert(`Syarat tidak terpenuhi! Butuh min ${c.minMembers} anak buah dan ${c.minPower} PWR.`);
        return;
    }

    const endTime = Date.now() + (c.durationSec * 1000);
    gameState.activeCrime = { crimeId: c.id, endTime };
    logMessage(`Eksekusi '${c.name}' dimulai...`, 'success');
    renderCrimes();
};

function crimeSingleTicker() {
    const box = document.getElementById('active-crime-status-box');
    if (!gameState.activeCrime) {
        if (box) box.classList.add('hidden');
        return;
    }

    if (box) box.classList.remove('hidden');

    const now = Date.now();
    const ac = gameState.activeCrime;
    const c = CRIMES_DATA.find(x => x.id === ac.crimeId);

    const sisaSec = Math.max(0, Math.ceil((ac.endTime - now) / 1000));
    document.getElementById('active-crime-name-label').innerText = `Jenis Aksi: ${c ? c.name : '-'}`;
    document.getElementById('active-crime-timer').innerText = sisaSec;

    if (now >= ac.endTime) {
        if (c) {
            let heatIncrease = c.heat;
            if (gameState.officers['akbp_hendro']) heatIncrease *= 0.7; // Reduksi Heat 30%

            if (Math.random() < 0.75) {
                gameState.money += c.reward;
                gameState.heat = Math.min(100, gameState.heat + heatIncrease);
                setAssistantMessage(`Aksi '${c.name}' selesai! Tambahan kas +Rp ${c.reward.toLocaleString('id-ID')}.`);
                logMessage(`Aksi '${c.name}' sukses! (+Rp ${c.reward.toLocaleString('id-ID')})`, 'success');

                if (gameState.heat >= 100) triggerPlayerJail();
            } else {
                gameState.heat = Math.min(100, gameState.heat + (heatIncrease * 2));
                if (Math.random() < 0.5 && gameState.members.length > 0) {
                    const jailedMem = gameState.members.pop();
                    gameState.jailedMembers.push({ ...jailedMem, timerSec: 60 });
                    setAssistantMessage(`Aksi '${c.name}' digerebek! 1 anak buah ditangkap!`);
                    logMessage(`Gagal! 1 Anak buah ditangkap polisi!`, 'danger');
                } else {
                    const loss = Math.floor(gameState.money * 0.15);
                    gameState.money -= loss;
                    setAssistantMessage(`Aksi '${c.name}' gagal! Rugi Rp ${loss.toLocaleString('id-ID')}.`);
                    logMessage(`Gagal! Rugi Rp ${loss.toLocaleString('id-ID')}`, 'danger');
                }
            }
        }

        gameState.activeCrime = null; // Reset slot
        renderCrimes();
        updateUI();
    }
}

// PERWIRA UNIK / UNDERBOSS (Revisi #5)
function renderOfficers() {
    const container = document.getElementById('officers-list');
    if (!container) return;
    container.innerHTML = '';

    OFFICERS_MASTER.forEach(o => {
        const isHired = gameState.officers[o.id];
        const card = document.createElement('div');
        card.className = `game-card ${isHired ? 'controlled-player' : ''}`;
        card.innerHTML = `
            <div>
                <h4>${o.name} (${o.title})</h4>
                <p>${o.desc}</p>
                <p>Biaya Rekrut: Rp ${o.cost.toLocaleString('id-ID')}</p>
            </div>
            ${isHired ? '<span class="text-green">✔ Perwira Aktif</span>' :
              `<button class="btn btn-gold" onclick="hireOfficer('${o.id}')">Rekrut Perwira</button>`}
        `;
        container.appendChild(card);
    });
}

window.hireOfficer = function(oId) {
    const o = OFFICERS_MASTER.find(x => x.id === oId);
    if (!o) return;

    if (gameState.money >= o.cost) {
        gameState.money -= o.cost;
        gameState.officers[oId] = true;
        setAssistantMessage(`Perwira '${o.name}' bergabung dengan sindikat kita!`);
        logMessage(`Merekrut Perwira Unik: ${o.name}`, 'success');
        renderOfficers();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

// BISNIS HARAM
function renderBusiness() {
    const container = document.getElementById('business-list');
    if (!container) return;
    container.innerHTML = '';

    BUSINESS_DATA.forEach(b => {
        const count = gameState.businesses[b.id] || 0;
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${b.name} (${count})</h4>
                <p>Pasif: +Rp ${b.income.toLocaleString('id-ID')} / mnt | Biaya: Rp ${b.cost.toLocaleString('id-ID')}</p>
            </div>
            <button class="btn btn-green" onclick="buyBusiness('${b.id}')">Beli Bisnis</button>
        `;
        container.appendChild(card);
    });
}

window.buyBusiness = function(bId) {
    const b = BUSINESS_DATA.find(x => x.id === bId);
    if (gameState.money >= b.cost) {
        gameState.money -= b.cost;
        gameState.businesses[bId] = (gameState.businesses[bId] || 0) + 1;
        logMessage(`Membeli bisnis '${b.name}'.`, 'success');
        renderBusiness();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

// REKRUT & PECAT PASUKAN
window.buyMember = function() {
    const cost = 2500000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        const pwr = Math.floor(Math.random() * 5) + 1;
        gameState.members.push({ id: Date.now(), power: pwr });
        setAssistantMessage(`1 Pasukan baru direkrut (+${pwr} PWR).`);
        logMessage(`Merekrut pasukan baru (+${pwr} PWR).`, 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.buyWeapon = function() {
    const cost = 10000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.weapons++;
        logMessage("Membeli 1 Senjata Baru (+25 PWR).", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

function renderMembersList() {
    const grid = document.getElementById('members-list-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (gameState.members.length === 0) {
        grid.innerHTML = '<p class="text-muted">Tidak ada anak buah aktif.</p>';
        return;
    }

    gameState.members.forEach((m, idx) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>Anak Buah #${idx + 1}</h4>
                <p>Kekuatan: <strong>${m.power} PWR</strong> | Upah: Rp 150.000 / mnt</p>
            </div>
            <button class="btn btn-red btn-xs" onclick="fireMember(${m.id})">Pecat Anak Buah</button>
        `;
        grid.appendChild(card);
    });
}

window.fireMember = function(memberId) {
    gameState.members = gameState.members.filter(m => m.id !== memberId);
    logMessage("Anak buah dipecat.", "danger");
    updateUI();
};

function removeRandomMembers(min, max) {
    if (gameState.members.length === 0) return;
    const count = Math.min(gameState.members.length, Math.floor(Math.random() * (max - min + 1)) + min); // Anggota gugur acak (Revisi #1)
    for (let i = 0; i < count; i++) {
        gameState.members.pop();
    }
}

// PENJARA & BALANCING POTONGAN BIAYA (Revisi #4)
function triggerPlayerJail() {
    gameState.isJailed = true;
    gameState.jailTimerSec = Math.floor(Math.random() * 40) + 20;
    document.getElementById('jail-modal').classList.remove('hidden');
    setAssistantMessage("DARURAT BOSS! Anda ditangkap Polda! Pilih opsi penyelamatan!");
}

function jailTicker() {
    if (gameState.isJailed) {
        gameState.jailTimerSec--;
        document.getElementById('jail-timer-count').innerText = gameState.jailTimerSec;
        if (gameState.jailTimerSec <= 0) {
            gameState.isJailed = false;
            gameState.heat = 20;
            document.getElementById('jail-modal').classList.add('hidden');
            setAssistantMessage("Anda dibebaskan dari penjara.");
            logMessage("Bebas dari penjara.", "success");
            updateUI();
        }
    }

    if (gameState.jailedMembers && gameState.jailedMembers.length > 0) {
        gameState.jailedMembers.forEach(m => m.timerSec--);
        const freed = gameState.jailedMembers.filter(m => m.timerSec <= 0);
        if (freed.length > 0) {
            freed.forEach(m => gameState.members.push({ id: m.id, power: m.power }));
            gameState.jailedMembers = gameState.jailedMembers.filter(m => m.timerSec > 0);
            logMessage(`${freed.length} Anak buah dibebaskan dari penjara!`, 'success');
            updateUI();
        }
    }
}

window.jailBribe100 = function() {
    const cost = 50000000;
    if (gameState.money >= cost) {
        gameState.money -= cost; // Potong saldo (Revisi #4)
        gameState.isJailed = false;
        gameState.heat = 0;
        document.getElementById('jail-modal').classList.add('hidden');
        logMessage("Suap 100% bebas instan (Rp 50 Juta).", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.jailLawyer = function() {
    const cost = 15000000;
    if (gameState.money >= cost) {
        gameState.money -= cost; // Potong saldo (Revisi #4)
        if (Math.random() < 0.45) {
            gameState.isJailed = false;
            gameState.heat = 20;
            document.getElementById('jail-modal').classList.add('hidden');
            logMessage("Pengacara memenangkan gugatan!", 'success');
        } else {
            gameState.jailTimerSec = Math.max(5, gameState.jailTimerSec - 15);
            alert("Hukuman dipotong 15 detik.");
        }
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.jailBreakout = function() {
    const cost = 5000000;
    if (gameState.money >= cost) {
        gameState.money -= cost; // Potong saldo (Revisi #4)
        if (Math.random() < 0.3) {
            gameState.isJailed = false;
            gameState.heat = 50;
            document.getElementById('jail-modal').classList.add('hidden');
            logMessage("Operasi pembebasan BERHASIL!", 'success');
        } else {
            alert("Operasi jebol penjara gagal! Waktu bertambah 15 detik.");
            gameState.jailTimerSec += 15;
            removeRandomMembers(1, 2);
        }
        updateUI();
    } else alert("Uang tidak cukup!");
};

function renderJailedMembersList() {
    const container = document.getElementById('jailed-members-list');
    const countEl = document.getElementById('jailed-members-count');
    if (!container) return;

    countEl.innerText = `${gameState.jailedMembers.length} Orang`;
    container.innerHTML = '';

    gameState.jailedMembers.forEach(m => {
        const item = document.createElement('div');
        item.className = 'jailed-item';
        item.innerHTML = `
            <span>Anak Buah (PWR ${m.power}) - Sisa: ${m.timerSec}s</span>
            <button class="btn btn-gold btn-xs" onclick="bribeFreeJailedMember(${m.id})">Suap Bebas (Rp 10 Juta)</button>
        `;
        container.appendChild(item);
    });
}

window.bribeFreeJailedMember = function(mId) {
    const cost = 10000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        const m = gameState.jailedMembers.find(x => x.id === mId);
        if (m) {
            gameState.members.push({ id: m.id, power: m.power });
            gameState.jailedMembers = gameState.jailedMembers.filter(x => x.id !== mId);
            logMessage("Menyuap untuk mengeluarkan anak buah.", 'success');
            updateUI();
        }
    } else alert("Uang kas tidak cukup!");
};

// EKSPEDISI PENYELUNDUPAN DENGAN ROTASI MISI (Revisi #7)
function rotateExpeditionMissions() {
    // Bersihkan yang expired
    const now = Date.now();
    gameState.availableExpeditions = (gameState.availableExpeditions || []).filter(ae => now < ae.expireTime);

    // Ambil acak 1-3 misi dari master 10
    if (gameState.availableExpeditions.length < 2) {
        const countToPick = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < countToPick; i++) {
            const randomExp = ALL_EXPEDITION_MASTER[Math.floor(Math.random() * ALL_EXPEDITION_MASTER.length)];
            const expireTime = now + ((Math.floor(Math.random() * 30) + 20) * 1000); // 20-50 detik batas pendaftaran
            
            if (!gameState.availableExpeditions.some(ae => ae.expId === randomExp.id)) {
                gameState.availableExpeditions.push({ id: Date.now() + Math.random(), expId: randomExp.id, expireTime });
            }
        }
    }

    renderExpeditions();
}

function renderExpeditions() {
    const container = document.getElementById('expeditions-list');
    if (!container) return;
    container.innerHTML = '';

    const hasActive = gameState.activeExpedition !== null;
    const now = Date.now();

    if (!gameState.availableExpeditions || gameState.availableExpeditions.length === 0) {
        container.innerHTML = '<p class="text-muted">Mencari penawaran penyelundupan baru...</p>';
        return;
    }

    gameState.availableExpeditions.forEach(ae => {
        const expType = ALL_EXPEDITION_MASTER.find(x => x.id === ae.expId);
        if (!expType) return;

        const sisaRegSec = Math.max(0, Math.ceil((ae.expireTime - now) / 1000));

        let effectiveRisk = expType.risk;
        if (gameState.officers['siti_mawar']) effectiveRisk = Math.max(0.1, effectiveRisk - 0.15); // Diskon risiko Siti Mawar

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${expType.name}</h4>
                <p>Durasi: ${expType.durationSec}s | Potensi: Rp ${expType.reward.toLocaleString('id-ID')}</p>
                <p>Risiko Gagal: ${(effectiveRisk * 100).toFixed(0)}% (Rugi Denda / Pasukan Gugur)</p>
                <p>Batas Pendaftaran: <strong class="text-yellow">${sisaRegSec} detik</strong></p>
            </div>
            <button class="btn btn-gold" ${hasActive || sisaRegSec <= 0 ? 'disabled' : ''} onclick="startExpedition('${ae.id}')">
                ${hasActive ? 'Ekspedisi Lain Berjalan' : 'Kirim Armada'}
            </button>
        `;
        container.appendChild(card);
    });
}

window.startExpedition = function(aeId) {
    if (gameState.activeExpedition) { alert("Selesaikan ekspedisi yang berjalan dulu!"); return; }

    const ae = gameState.availableExpeditions.find(x => x.id == aeId);
    if (!ae) return;

    const expType = ALL_EXPEDITION_MASTER.find(x => x.id === ae.expId);
    if (!expType) return;

    if (gameState.members.length < 3) {
        alert("Butuh minimal 3 anak buah untuk mengawal ekspedisi!");
        return;
    }

    const endTime = Date.now() + (expType.durationSec * 1000);
    gameState.activeExpedition = { id: Date.now(), expId: expType.id, endTime };
    gameState.availableExpeditions = gameState.availableExpeditions.filter(x => x.id != aeId);

    logMessage(`Memulai ekspedisi '${expType.name}'.`, 'success');
    renderExpeditions();
    updateUI();
};

function expeditionTicker() {
    renderExpeditions();

    if (!gameState.activeExpedition) {
        renderActiveExpeditions();
        return;
    }

    const now = Date.now();
    const exp = gameState.activeExpedition;

    if (now >= exp.endTime) {
        const expType = ALL_EXPEDITION_MASTER.find(x => x.id === exp.expId);
        if (expType) {
            let effectiveRisk = expType.risk;
            if (gameState.officers['siti_mawar']) effectiveRisk = Math.max(0.1, effectiveRisk - 0.15);

            if (Math.random() > effectiveRisk) {
                gameState.money += expType.reward;
                setAssistantMessage(`KABAR SUKSES! Ekspedisi '${expType.name}' menghasilkan Rp ${expType.reward.toLocaleString('id-ID')}!`);
                logMessage(`Ekspedisi '${expType.name}' sukses! (+Rp ${expType.reward.toLocaleString('id-ID')})`, 'success');
            } else {
                if (Math.random() < 0.5 && gameState.members.length > 0) {
                    removeRandomMembers(1, 3); // Pasukan gugur acak (Revisi #1)
                    setAssistantMessage(`Gagal! Armada '${expType.name}' diserang! Beberapa pasukan gugur.`);
                    logMessage(`Gagal! Pasukan gugur di laut.`, 'danger');
                } else {
                    gameState.money = Math.max(0, gameState.money - expType.penaltyMoney);
                    setAssistantMessage(`Gagal! Barang disita. Denda ganti rugi Rp ${expType.penaltyMoney.toLocaleString('id-ID')}.`);
                    logMessage(`Gagal! Rugi denda ganti rugi Rp ${expType.penaltyMoney.toLocaleString('id-ID')}.`, 'danger');
                }
            }
        }

        gameState.activeExpedition = null;
        renderExpeditions();
        updateUI();
    }

    renderActiveExpeditions();
}

function renderActiveExpeditions() {
    const container = document.getElementById('active-expeditions-list');
    if (!container) return;
    container.innerHTML = '';

    if (!gameState.activeExpedition) {
        container.innerHTML = '<p class="text-muted">Tidak ada ekspedisi berjalan.</p>';
        return;
    }

    const now = Date.now();
    const exp = gameState.activeExpedition;
    const expType = ALL_EXPEDITION_MASTER.find(x => x.id === exp.expId);
    const sisaSec = Math.max(0, Math.ceil((exp.endTime - now) / 1000));

    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
        <div>
            <h4>${expType ? expType.name : '-'}</h4>
            <p>Sisa Waktu Perjalanan: <strong class="text-yellow">${sisaSec} detik</strong></p>
        </div>
    `;
    container.appendChild(card);
}

// EKSPANSI LUAR NEGERI
function renderGlobalTargets() {
    const container = document.getElementById('global-targets-list');
    const descEl = document.getElementById('global-status-desc');
    if (!container) return;
    container.innerHTML = '';

    let totalIndoCities = 0;
    PROVINCES.forEach(p => totalIndoCities += p.cities.length);
    const playerIndoCities = Object.keys(gameState.controlledCities).length;

    const isIndoCleared = playerIndoCities >= totalIndoCities;

    if (isIndoCleared) {
        descEl.innerText = "Seluruh Indonesia terkuasai! Saatnya melebarkan sayap ke kartel dunia!";
        descEl.className = "text-green";
    } else {
        descEl.innerText = `Progress Indonesia: ${playerIndoCities}/${totalIndoCities} Kota Terkuasai. Kuasai 100% Indonesia untuk membuka Ekspansi Internasional!`;
        descEl.className = "text-yellow";
    }

    GLOBAL_TARGETS.forEach(g => {
        const isControlled = gameState.controlledGlobal[g.id];
        const card = document.createElement('div');
        card.className = `game-card ${isControlled ? 'controlled-player' : ''}`;
        card.innerHTML = `
            <div>
                <h4>${g.name}</h4>
                <p>Syarat: Min ${g.reqPower} PWR Total</p>
                <p>Setoran Royalty: +Rp ${g.rewardPerMin.toLocaleString('id-ID')} / mnt</p>
            </div>
            ${isControlled ? '<span class="text-green">✔ Menguasai Kartel Ini</span>' :
              `<button class="btn btn-red" ${!isIndoCleared ? 'disabled' : ''} onclick="conquerGlobal('${g.id}')">Taklukkan Kartel</button>`}
        `;
        container.appendChild(card);
    });
}

window.conquerGlobal = function(gId) {
    const g = GLOBAL_TARGETS.find(x => x.id === gId);
    if (!g) return;

    if (getPlayerTotalPower() < g.reqPower) {
        alert(`Power Tempur Anda (${getPlayerTotalPower()} PWR) kurang! Butuh min ${g.reqPower} PWR.`);
        return;
    }

    gameState.controlledGlobal[gId] = true;
    setAssistantMessage(`Kemenangan Bersejarah! Kartel '${g.name}' resmi menjadi bawahan Anda!`);
    logMessage(`BERHASIL MENAKLUKKAN KARTEL INTERNASIONAL: ${g.name}!`, 'success');
    renderGlobalTargets();
    updateUI();
};

// DONASI ORMAS & SUAP POLISI
window.donateOrmas = function() {
    const cost = 15000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.heat = Math.max(0, gameState.heat - 15);
        setAssistantMessage("Donasi disalurkan! Heat -15%.");
        logMessage("Bakti Sosial Ormas. Heat -15%.", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.bribePolice = function() {
    const cost = 40000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.heat = Math.max(0, gameState.heat - 25);
        setAssistantMessage("Suap oknum berhasil! Heat -25%.");
        logMessage("Suap Oknum Polisi. Heat -25%.", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

// EVENT ACAK 5-10 MENIT & COUNTDOWN 20 DETIK (Revisi #8)
function scheduleNextRandomEvent() {
    const randomMs = (Math.floor(Math.random() * 300) + 300) * 1000; // 5 - 10 Menit
    setTimeout(() => {
        triggerRandomEvent();
        scheduleNextRandomEvent();
    }, randomMs);
}

function triggerRandomEvent() {
    if (!currentUser || !gameState.setupDone || gameState.isJailed) return;

    const events = [
        {
            title: "SERANGAN GENG MAFIA RIVAL!",
            desc: "Geng musuh menyerang salah satu bisnis haram Anda!",
            choices: [
                { text: "Kirim Pasukan Perang (Butuh 150 PWR)", action: () => {
                    if (getPlayerTotalPower() >= 150) {
                        logMessage("Berhasil memukul mundur geng rival!", 'success');
                    } else {
                        gameState.money = Math.max(0, gameState.money - 15000000);
                        logMessage("Kekuatan kurang! Bisnis dirusak, rugi Rp 15 Juta.", 'danger');
                    }
                }},
                { text: "Bayar Uang Damai (Rp 10.000.000)", action: () => { gameState.money = Math.max(0, gameState.money - 10000000); } }
            ]
        },
        {
            title: "SIDAK POLDA / POLRES",
            desc: "Tim intel kepolisian melakukan patroli ketat di wilayah Anda.",
            choices: [
                { text: "Tutup Bisnis Sementara (Heat -10%)", action: () => { gameState.heat = Math.max(0, gameState.heat - 10); } },
                { text: "Abaikan Sidak (Heat +15%)", action: () => { gameState.heat = Math.min(100, gameState.heat + 15); } }
            ]
        }
    ];

    currentActiveEvent = events[Math.floor(Math.random() * events.length)];
    eventTimerSec = 20;
    showEventModal(currentActiveEvent);
}

function showEventModal(ev) {
    document.getElementById('event-title').innerText = ev.title;
    document.getElementById('event-desc').innerText = ev.desc;
    document.getElementById('event-timer-count').innerText = eventTimerSec;

    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    ev.choices.forEach((c, idx) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-gold full-btn';
        btn.style.marginBottom = '8px';
        btn.innerText = c.text;
        btn.onclick = () => {
            c.action();
            currentActiveEvent = null;
            document.getElementById('event-modal').classList.add('hidden');
            updateUI();
        };
        choicesEl.appendChild(btn);
    });

    document.getElementById('event-modal').classList.remove('hidden');
}

function eventModalTimerTicker() {
    if (!currentActiveEvent) return;

    eventTimerSec--;
    const el = document.getElementById('event-timer-count');
    if (el) el.innerText = eventTimerSec;

    if (eventTimerSec <= 0) {
        // Pilihan acak otomatis jika waktu habis (Revisi #8)
        const randomChoice = currentActiveEvent.choices[Math.floor(Math.random() * currentActiveEvent.choices.length)];
        randomChoice.action();
        currentActiveEvent = null;
        document.getElementById('event-modal').classList.add('hidden');
        logMessage("Waktu event habis! Pilihan otomatis dieksekusi oleh sistem.", 'danger');
        updateUI();
    }
}

// RESET PROGRESS
window.resetGameProgress = async function() {
    if (!confirm("Apakah Anda yakin ingin MERESET TOTAL progress dan mulai dari awal lagi?")) return;

    gameState = createDefaultGameState();
    payoutCountdownSec = 60;

    await cloudAutosave();
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('setup-modal').classList.remove('hidden');
    alert("Progress game berhasil di-reset!");
};

// HELPERS
function getProvinceObj(pId) { return PROVINCES.find(p => p.id === pId); }
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    return hash;
}

function logMessage(msg, type = '') {
    const logs = document.getElementById('game-logs');
    if (!logs) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logs.appendChild(entry);
}

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
    { id: 'jabar', name: 'Jawa Barat', minPower: 100, cities: ['Bandung', 'Bekasi', 'Depok', 'Bogor', 'Cirebon', 'Sukabumi'] },
    { id: 'jateng', name: 'Jawa Tengah', minPower: 300, cities: ['Semarang', 'Solo', 'Magelang', 'Tegal', 'Pekalongan', 'Cilacap'] },
    { id: 'jatim', name: 'Jawa Timur', minPower: 600, cities: ['Surabaya', 'Malang', 'Kediri', 'Madiun', 'Banyuwangi', 'Probolinggo'] },
    { id: 'sumut', name: 'Sumatera Utara', minPower: 1000, cities: ['Medan', 'Pematangsiantar', 'Binjai', 'Tanjungbalai', 'Tebing Tinggi'] },
    { id: 'sulsel', name: 'Sulawesi Selatan', minPower: 1500, cities: ['Makassar', 'Palopo', 'Parepare', 'Toraja', 'Bone'] }
];

const RIVAL_NAMES = ['Geng Banteng Merah', 'Kartel Batavia', 'Ormas Pesisir', 'Mafia Port', 'Sindikat Hitam', 'Geng Kampung Atas'];

// AKSI KRIMINAL BERBAGAI TINGKAT
const CRIMES_DATA = [
    { id: 'parkir_liar', name: 'Pungli Parkir Liar', minMembers: 1, minPower: 0, reward: 200000, rep: 2, heat: 3 },
    { id: 'peras_pasar', name: 'Peras Pedagang Pasar', minMembers: 2, minPower: 10, reward: 600000, rep: 5, heat: 5 },
    { id: 'begal', name: 'Begal Motor Malam', minMembers: 3, minPower: 25, reward: 1800000, rep: 10, heat: 8 },
    { id: 'judi_online', name: 'Markas Judi Online Tersembunyi', minMembers: 5, minPower: 60, reward: 5000000, rep: 20, heat: 12 },
    { id: 'rampok_toko', name: 'Perampokan Toko Emas', minMembers: 8, minPower: 120, reward: 15000000, rep: 40, heat: 18 },
    { id: 'penyelundupan_bbm', name: 'Penyelundupan BBM Subsidi', minMembers: 12, minPower: 250, reward: 45000000, rep: 80, heat: 25 }
];

// BISNIS HARAM VARIANTS
const BUSINESS_DATA = [
    { id: 'warung_remang', name: 'Warung Remang-Remang', cost: 3000000, income: 40000 },
    { id: 'gelanggang_ayam', name: 'Arena Judi Sabung Ayam', cost: 12000000, income: 180000 },
    { id: 'bengkel_pretelan', name: 'Bengkel Motor Pretelan', cost: 35000000, income: 550000 },
    { id: 'club_malam', name: 'Diskotek & Bar Malam', cost: 120000000, income: 2000000 },
    { id: 'kasino_gelap', name: 'Kasino Gelap Bawah Tanah', cost: 500000000, income: 9000000 }
];

// EKSPEDISI PENYELUNDUPAN
const EXPEDITION_TYPES = [
    { id: 'truk_lintas', name: 'Penyelundupan Truk Lintas Jawa', durationSec: 45, reward: 25000000, risk: 0.3 },
    { id: 'kapal_feri', name: 'Kapal Feri Gelap Jawa-Sumatera', durationSec: 90, reward: 75000000, risk: 0.4 },
    { id: 'kontainer_laut', name: 'Kontainer Laut Lintas Pulau', durationSec: 180, reward: 220000000, risk: 0.5 }
];

// STATE GAME DEFAULT TEMPLATE
function createDefaultGameState() {
    return {
        setupDone: false,
        homeProvince: 'dki',
        homeCity: 'Jakarta Pusat',
        money: 2000000,
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
        businesses: {},
        controlledCities: {},
        activeExpeditions: []
    };
}

let currentUser = null;
let currentAuthMode = 'login';
let gameState = createDefaultGameState();

// TIMER UPDATE 15 DETIK (Revisi #1)
let payoutCountdownSec = 15;

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    populateSetupSelects();

    // Ticker Utama 1 Detik untuk hitung mundur timer & Payout tiap 15 Detik
    setInterval(secondTicker, 1000);
    setInterval(expeditionTicker, 1000);
    setInterval(cloudAutosave, 15000);

    // Random Event Timer (1-5 Menit)
    scheduleNextRandomEvent();
});

// AUTH SYSTEM - FIX DATA DARI AKUN SEBELUMNYA (Revisi #2)
function setupAuthListeners() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // Bersihkan data lokal sebelum memuat akun baru agar tidak tumpuk (Revisi #2)
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
            gameState = createDefaultGameState(); // Reset total saat logout
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
            gameState = createDefaultGameState(); // Akun baru dapat modal bersih
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
    gameState.controlledCities = {}; // Reset kota
    gameState.controlledCities[cName] = true; 
    gameState.setupDone = true;

    document.getElementById('setup-modal').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    await cloudAutosave();
    initUI();
    setAssistantMessage(`Selamat datang Boss! Kita telah mendirikan markas pertama kita di ${cName}, ${getProvinceObj(pId).name}. Mari kumpulkan uang dan rekrut anggota!`);
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

// TICKER PER DETIK & COUNTDOWN 15 DETIK (Revisi #1)
function secondTicker() {
    if (!currentUser || !gameState.setupDone) return;

    // Hitung mundur Payout Kas (15 Detik)
    payoutCountdownSec--;
    const timerEl = document.getElementById('stat-timer-15s');
    if (timerEl) timerEl.innerText = `${payoutCountdownSec} detik`;

    if (payoutCountdownSec <= 0) {
        payoutCountdownSec = 15; // Reset timer ke 15 detik

        if (!gameState.isJailed) {
            const income = calculateTotalIncome15Sec();
            const expenses = calculateTotalExpenses15Sec();
            const net = income - expenses;

            gameState.money += net;

            if (gameState.money < 0) {
                gameState.money = 0;
                if (gameState.members.length > 0 && Math.random() < 0.4) {
                    const removed = gameState.members.pop();
                    setAssistantMessage(`Uang kas minus! 1 anak buah (PWR ${removed.power}) kabur karena belum digaji!`);
                    logMessage("1 Anak buah kabur karena gaji menunggak!", "danger");
                }
            }
        }
    }

    jailTicker();
    updateUI();
}

function calculateTotalIncome15Sec() {
    let income = 0;
    BUSINESS_DATA.forEach(b => {
        income += (gameState.businesses[b.id] || 0) * b.income;
    });

    const controlledCount = Object.keys(gameState.controlledCities).length;
    income += controlledCount * 150000; // Bonus per kota per 15 detik
    return income;
}

function calculateTotalExpenses15Sec() {
    return gameState.members.length * 30000; // Gaji per anak buah per 15 detik
}

function getPlayerTotalPower() {
    let pwr = gameState.weapons * 20;
    gameState.members.forEach(m => pwr += m.power);
    return pwr;
}

// UI RENDERING
function initUI() {
    populateProvinceViewSelect();
    renderCrimes();
    renderBusiness();
    renderExpeditions();
    updateUI();
}

function updateUI() {
    if (!gameState.setupDone) return;

    document.getElementById('user-display-name').innerText = currentUser ? currentUser.email.split('@')[0] : 'Boss';
    document.getElementById('player-location-badge').innerText = `Basecamp: ${gameState.homeCity} (${getProvinceObj(gameState.homeProvince).name})`;

    const income = calculateTotalIncome15Sec();
    const expenses = calculateTotalExpenses15Sec();
    const net = income - expenses;

    document.getElementById('stat-money').innerText = `Rp ${gameState.money.toLocaleString('id-ID')}`;
    document.getElementById('stat-income').innerText = `+Rp ${income.toLocaleString('id-ID')}`;
    document.getElementById('stat-expenses').innerText = `-Rp ${expenses.toLocaleString('id-ID')}`;
    document.getElementById('stat-net').innerText = `${net >= 0 ? '+' : ''}Rp ${net.toLocaleString('id-ID')}`;
    document.getElementById('stat-net').className = `stat-value ${net >= 0 ? 'text-blue' : 'text-red'}`;

    document.getElementById('stat-members').innerText = `${gameState.members.length} Orang`;
    document.getElementById('stat-power').innerText = `${getPlayerTotalPower()} PWR`;
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

// PETA WILAYAH
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
            <p style="font-size:0.8rem; color:#8c96a5;">Bonus Kas: +Rp 150.000 / 15dtk</p>
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
    const reqPwr = prov.minPower + 30;

    if (myPwr < reqPwr) {
        alert(`Power Tempur Anda (${myPwr} PWR) kurang untuk merebut ${cityName}! Dibutuhkan minimal ${reqPwr} PWR.`);
        return;
    }

    if (Math.random() < 0.6) {
        gameState.controlledCities[cityName] = true;
        setAssistantMessage(`KABAR GEMBIRA BOSS! Kota ${cityName} berhasil ditaklukkan!`);
        logMessage(`BERHASIL! Menyerang dan menguasai kota ${cityName}!`, 'success');
    } else {
        if (gameState.members.length > 0) gameState.members.pop();
        setAssistantMessage(`Gagal merebut kota ${cityName}! Pertahanan musuh sangat kuat, 1 anak buah kita gugur!`);
        logMessage(`GAGAL! Serangan ke ${cityName} dipukul mundur. 1 Anak buah gugur.`, 'danger');
    }
    updateUI();
};

// AKSI KRIMINAL
function renderCrimes() {
    const container = document.getElementById('crimes-list');
    if (!container) return;
    container.innerHTML = '';

    CRIMES_DATA.forEach(c => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${c.name}</h4>
                <p>Syarat: Min ${c.minMembers} Anak Buah, ${c.minPower} Power</p>
                <p>Hasil: +Rp ${c.reward.toLocaleString('id-ID')} | Heat +${c.heat}%</p>
            </div>
            <button class="btn btn-gold" onclick="doCrime('${c.id}')">Eksekusi Aksi</button>
        `;
        container.appendChild(card);
    });
}

window.doCrime = function(crimeId) {
    if (gameState.isJailed) { alert("Anda sedang di dalam penjara!"); return; }

    const c = CRIMES_DATA.find(x => x.id === crimeId);
    if (!c) return;

    if (gameState.members.length < c.minMembers || getPlayerTotalPower() < c.minPower) {
        alert(`Syarat tidak terpenuhi! Butuh min ${c.minMembers} anak buah dan ${c.minPower} PWR.`);
        return;
    }

    if (Math.random() < 0.75) {
        gameState.money += c.reward;
        gameState.heat = Math.min(100, gameState.heat + c.heat);
        logMessage(`Aksi '${c.name}' berhasil! (+Rp ${c.reward.toLocaleString('id-ID')})`, 'success');

        if (gameState.heat >= 100) {
            triggerPlayerJail();
        }
    } else {
        gameState.heat = Math.min(100, gameState.heat + (c.heat * 2));
        if (Math.random() < 0.5 && gameState.members.length > 0) {
            const jailedMem = gameState.members.pop();
            gameState.jailedMembers.push({ ...jailedMem, timerSec: 60 });
            setAssistantMessage(`Aksi '${c.name}' digerebek! 1 anak buah kita ditangkap polisi!`);
            logMessage(`Gagal! 1 Anak buah ditangkap polisi!`, 'danger');
        } else {
            const loss = Math.floor(gameState.money * 0.15);
            gameState.money -= loss;
            setAssistantMessage(`Aksi '${c.name}' gagal! Kita rugi Rp ${loss.toLocaleString('id-ID')} untuk melarikan diri.`);
            logMessage(`Gagal! Rugi Rp ${loss.toLocaleString('id-ID')}`, 'danger');
        }
    }
    updateUI();
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
                <p>Pasif: +Rp ${b.income.toLocaleString('id-ID')} / 15dtk | Biaya: Rp ${b.cost.toLocaleString('id-ID')}</p>
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
    const cost = 500000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        const pwr = Math.floor(Math.random() * 5) + 1;
        gameState.members.push({ id: Date.now(), power: pwr });
        setAssistantMessage(`1 Anak buah baru direkrut dengan Power Tempur ${pwr} PWR.`);
        logMessage(`Merekrut anak buah baru (+${pwr} PWR).`, 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.buyWeapon = function() {
    const cost = 2000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.weapons++;
        logMessage("Membeli 1 Senjata Baru (+20 PWR).", 'success');
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
                <p>Kekuatan: <strong>${m.power} PWR</strong> | Upah: Rp 30.000 / 15dtk</p>
            </div>
            <button class="btn btn-red btn-xs" onclick="fireMember(${m.id})">Pecat Anak Buah</button>
        `;
        grid.appendChild(card);
    });
}

window.fireMember = function(memberId) {
    gameState.members = gameState.members.filter(m => m.id !== memberId);
    logMessage("Anak buah dipecat untuk mengurangi beban biaya.", "danger");
    updateUI();
};

// PENJARA & TAHANAN
function triggerPlayerJail() {
    gameState.isJailed = true;
    gameState.jailTimerSec = Math.floor(Math.random() * 40) + 20;
    document.getElementById('jail-modal').classList.remove('hidden');
    setAssistantMessage("DARURAT BOSS! Anda ditangkap Polda! Pilih opsi penyelamatan segera!");
}

function jailTicker() {
    if (gameState.isJailed) {
        gameState.jailTimerSec--;
        document.getElementById('jail-timer-count').innerText = gameState.jailTimerSec;
        if (gameState.jailTimerSec <= 0) {
            gameState.isJailed = false;
            gameState.heat = 20;
            document.getElementById('jail-modal').classList.add('hidden');
            setAssistantMessage("Anda telah selesai menjalani masa tahanan dan dibebaskan.");
            logMessage("Bebas dari penjara setelah masa tahanan habis.", "success");
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
    const cost = 15000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.isJailed = false;
        gameState.heat = 0;
        document.getElementById('jail-modal').classList.add('hidden');
        logMessage("Menyuap petinggi kepolisian! Bebas instan 100%.", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup untuk suap 100%!");
};

window.jailLawyer = function() {
    const cost = 4000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        if (Math.random() < 0.45) {
            gameState.isJailed = false;
            gameState.heat = 20;
            document.getElementById('jail-modal').classList.add('hidden');
            logMessage("Pengacara berhasil memenangkan gugatan! Bebas dari penjara.", 'success');
        } else {
            gameState.jailTimerSec = Math.max(5, gameState.jailTimerSec - 15);
            alert("Pengacara gagal membebaskan penuh, tapi berhasil memotong hukuman 15 detik!");
        }
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.jailBreakout = function() {
    const cost = 1000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        if (Math.random() < 0.3) {
            gameState.isJailed = false;
            gameState.heat = 50;
            document.getElementById('jail-modal').classList.add('hidden');
            logMessage("Operasi pembebasan anak buah BERHASIL!", 'success');
        } else {
            alert("Operasi jebol penjara gagal! Waktu tahanan bertambah 15 detik!");
            gameState.jailTimerSec += 15;
            if (gameState.members.length > 0) gameState.members.pop();
        }
        updateUI();
    } else alert("Uang tidak cukup!");
};

function renderJailedMembersList() {
    const container = document.getElementById('jailed-members-list');
    const countEl = document.getElementById('jailed-members-count');
    if (!container) return;

    countEl.innerText = gameState.jailedMembers.length;
    container.innerHTML = '';

    gameState.jailedMembers.forEach(m => {
        const item = document.createElement('div');
        item.className = 'jailed-item';
        item.innerHTML = `
            <span>Anak Buah (PWR ${m.power}) - Sisa: ${m.timerSec}s</span>
            <button class="btn btn-gold btn-xs" onclick="bribeFreeJailedMember(${m.id})">Suap Bebas (Rp 2 Juta)</button>
        `;
        container.appendChild(item);
    });
}

window.bribeFreeJailedMember = function(mId) {
    const cost = 2000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        const m = gameState.jailedMembers.find(x => x.id === mId);
        if (m) {
            gameState.members.push({ id: m.id, power: m.power });
            gameState.jailedMembers = gameState.jailedMembers.filter(x => x.id !== mId);
            logMessage("Menyuap untuk mengeluarkan anak buah dari sel.", 'success');
            updateUI();
        }
    } else alert("Uang kas tidak cukup!");
};

// EKSPEDISI PENYELUNDUPAN
function renderExpeditions() {
    const container = document.getElementById('expeditions-list');
    if (!container) return;
    container.innerHTML = '';

    EXPEDITION_TYPES.forEach(e => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${e.name}</h4>
                <p>Durasi: ${e.durationSec}s | Potensi Hasil: Rp ${e.reward.toLocaleString('id-ID')}</p>
                <p>Risiko Pembajakan/Polairud: ${e.risk * 100}%</p>
            </div>
            <button class="btn btn-gold" onclick="startExpedition('${e.id}')">Kirim Armada</button>
        `;
        container.appendChild(card);
    });
}

window.startExpedition = function(eId) {
    const expType = EXPEDITION_TYPES.find(x => x.id === eId);
    if (!expType) return;

    if (gameState.members.length < 3) {
        alert("Butuh minimal 3 anak buah untuk mengawal ekspedisi!");
        return;
    }

    const endTime = Date.now() + (expType.durationSec * 1000);
    gameState.activeExpeditions.push({ id: Date.now(), typeId: eId, endTime });
    logMessage(`Memulai '${expType.name}'. Armada sedang dalam perjalanan...`, 'success');
    updateUI();
};

function expeditionTicker() {
    if (!gameState.activeExpeditions || gameState.activeExpeditions.length === 0) return;

    const now = Date.now();
    const finished = gameState.activeExpeditions.filter(e => now >= e.endTime);

    if (finished.length > 0) {
        finished.forEach(exp => {
            const expType = EXPEDITION_TYPES.find(x => x.id === exp.typeId);
            if (expType) {
                if (Math.random() > expType.risk) {
                    gameState.money += expType.reward;
                    setAssistantMessage(`KABAR SUKSES! Armada '${expType.name}' tiba dan menghasilkan Rp ${expType.reward.toLocaleString('id-ID')}!`);
                    logMessage(`Ekspedisi '${expType.name}' sukses! (+Rp ${expType.reward.toLocaleString('id-ID')})`, 'success');
                } else {
                    setAssistantMessage(`Gagal! Armada '${expType.name}' dihadang Polairud/Begal Laut! Barang sita total.`);
                    logMessage(`Ekspedisi '${expType.name}' dibajak/ditangkap!`, 'danger');
                }
            }
        });

        gameState.activeExpeditions = gameState.activeExpeditions.filter(e => now < e.endTime);
        updateUI();
    }

    renderActiveExpeditions();
}

function renderActiveExpeditions() {
    const container = document.getElementById('active-expeditions-list');
    if (!container) return;
    container.innerHTML = '';

    if (gameState.activeExpeditions.length === 0) {
        container.innerHTML = '<p class="text-muted">Tidak ada ekspedisi berjalan.</p>';
        return;
    }

    const now = Date.now();
    gameState.activeExpeditions.forEach(exp => {
        const expType = EXPEDITION_TYPES.find(x => x.id === exp.typeId);
        const sisaSec = Math.max(0, Math.ceil((exp.endTime - now) / 1000));

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${expType.name}</h4>
                <p>Sisa Waktu Perjalanan: <strong class="text-yellow">${sisaSec} detik</strong></p>
            </div>
        `;
        container.appendChild(card);
    });
}

// DONASI ORMAS & SUAP POLISI
window.donateOrmas = function() {
    const cost = 3000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.heat = Math.max(0, gameState.heat - 15);
        setAssistantMessage("Donasi bakti sosial disalurkan! Opini publik membaik, Heat Level berkurang -15%.");
        logMessage("Mengadakan Donasi Ormas/Sosial. Heat -15%.", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.bribePolice = function() {
    const cost = 8000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.heat = Math.max(0, gameState.heat - 25);
        setAssistantMessage("Suap oknum berhasil! Laporan kejahatan dimusnahkan. Heat Level berkurang -25%.");
        logMessage("Menyuap Oknum Polisi. Heat -25%.", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

// RANDOM EVENTS
function scheduleNextRandomEvent() {
    const randomMs = (Math.floor(Math.random() * 240) + 60) * 1000;
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
                { text: "Kirim Pasukan Perang (Butuh PWR)", action: () => {
                    if (getPlayerTotalPower() >= 50) {
                        logMessage("Berhasil memukul mundur geng rival!", 'success');
                    } else {
                        gameState.money = Math.max(0, gameState.money - 3000000);
                        logMessage("Kekuatan kurang! Bisnis Anda dirusak, rugi Rp 3 Juta.", 'danger');
                    }
                }},
                { text: "Bayar Uang Damai (Rp 2.000.000)", action: () => { gameState.money = Math.max(0, gameState.money - 2000000); } }
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

    const ev = events[Math.floor(Math.random() * events.length)];
    showEventModal(ev);
}

function showEventModal(ev) {
    document.getElementById('event-title').innerText = ev.title;
    document.getElementById('event-desc').innerText = ev.desc;
    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    ev.choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-gold full-btn';
        btn.style.marginBottom = '8px';
        btn.innerText = c.text;
        btn.onclick = () => {
            c.action();
            document.getElementById('event-modal').classList.add('hidden');
            updateUI();
        };
        choicesEl.appendChild(btn);
    });

    document.getElementById('event-modal').classList.remove('hidden');
}

// FIX RESET PROGRESS (Revisi #3)
window.resetGameProgress = async function() {
    if (!confirm("Apakah Anda yakin ingin MERESET TOTAL progress dan mulai dari awal lagi?")) return;

    gameState = createDefaultGameState();
    payoutCountdownSec = 15;

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

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

// KREDENSIAL FIREBASE MILIK ANDA
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

// STATE GAME DEFAULT
let currentUser = null;
let currentAuthMode = 'login';

let gameState = {
    money: 1000000,
    reputation: 0,
    members: 1,
    weapons: 0,
    heat: 0,
    loan: 0,
    businesses: { parkir: 0, warung: 0, club: 0, sabung: 0 },
    turfs: {
        'dki': 'player',
        'jabar': 'enemy-1',
        'jateng': 'enemy-2',
        'jatim': 'enemy-3',
        'sumatera': 'enemy-1'
    }
};

const RANKS = [
    { name: "Preman Pasar", minRep: 0 },
    { name: "Kepala Keamanan", minRep: 100 },
    { name: "Bos Ormas", minRep: 500 },
    { name: "Ketua Kartel", minRep: 2000 },
    { name: "Don Sindikat", minRep: 10000 }
];

const CRIMES = [
    { id: 'peras', name: 'Peras Pedagang Pasar', rewardMoney: 150000, rewardRep: 2, heat: 3 },
    { id: 'begal', name: 'Begal Motor Jalanan', rewardMoney: 500000, rewardRep: 5, heat: 8 },
    { id: 'penyelundupan', name: 'Penyelundupan Barang Bekas', rewardMoney: 2000000, rewardRep: 15, heat: 18 }
];

const BUSINESS_DATA = [
    { id: 'parkir', name: 'Lahan Parkir Liar', cost: 2000000, income: 15000 },
    { id: 'warung', name: 'Warung Remang-Remang', cost: 10000000, income: 80000 },
    { id: 'club', name: 'Club Malam & Bar', cost: 50000000, income: 450000 },
    { id: 'sabung', name: 'Arena Judi Sabung Ayam', cost: 250000000, income: 2500000 }
];

const RIVALS_DATA = [
    { id: 'enemy-1', name: 'Geng Kampung Atas', power: 25 },
    { id: 'enemy-2', name: 'Ormas Banteng Hitam', power: 80 },
    { id: 'enemy-3', name: 'Kartel Batavia', power: 250 }
];

const TURF_DATA = [
    { id: 'dki', name: 'DKI Jakarta & Banten', bonus: 100000 },
    { id: 'jabar', name: 'Jawa Barat', bonus: 80000 },
    { id: 'jateng', name: 'Jawa Tengah & DIY', bonus: 70000 },
    { id: 'jatim', name: 'Jawa Timur & Bali', bonus: 90000 },
    { id: 'sumatera', name: 'Sumatera & Kalimantan', bonus: 120000 }
];

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    renderCrimes();
    renderBusiness();
    renderRivals();
    
    // Ticker Loops
    setInterval(gameLoop, 1000);
    setInterval(cloudAutosave, 12000);
    setInterval(triggerRandomEvent, 35000);
});

// AUTHENTICATION SYSTEM
function setupAuthListeners() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('auth-modal').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            document.getElementById('user-display-name').innerText = user.email.split('@')[0];
            await loadUserData();
            logMessage(`Selamat datang kembali, Boss ${user.email.split('@')[0]}!`, 'success');
        } else {
            currentUser = null;
            document.getElementById('auth-modal').classList.remove('hidden');
            document.getElementById('game-container').classList.add('hidden');
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
            await createUserWithEmailAndPassword(auth, email, password);
            await cloudAutosave();
        }
    } catch (err) {
        errorEl.innerText = "Gagal Login/Daftar: " + err.message;
    }
};

window.logout = function() {
    signOut(auth);
};

// FIRESTORE SYNC
async function cloudAutosave() {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, "users", currentUser.uid), gameState, { merge: true });
        logMessage("Progress otomatis tersimpan di Cloud Firestore.", "success");
    } catch (err) {
        console.error("Autosave error:", err);
    }
}

async function loadUserData() {
    if (!currentUser) return;
    try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
            gameState = { ...gameState, ...docSnap.data() };
        }
        updateUI();
    } catch (err) {
        console.error("Load error:", err);
    }
}

// GAME TICKER & CALCULATIONS
function gameLoop() {
    if (!currentUser) return;

    // Income Passive
    let passiveIncome = 0;
    BUSINESS_DATA.forEach(b => {
        passiveIncome += (gameState.businesses[b.id] || 0) * b.income;
    });

    // Turf Income Bonus
    TURF_DATA.forEach(t => {
        if (gameState.turfs[t.id] === 'player') {
            passiveIncome += t.bonus;
        }
    });

    // Expenses (Gaji)
    const expenses = gameState.members * 10000;
    const netIncome = passiveIncome - expenses;

    // Bunga Rentenir
    if (gameState.loan > 0) {
        gameState.loan += Math.floor(gameState.loan * 0.001);
    }

    gameState.money += netIncome;
    if (gameState.money < 0) {
        gameState.money = 0;
        if (gameState.members > 1 && Math.random() < 0.2) {
            gameState.members--;
            logMessage("Kas kosong! 1 Anak buah kabur karena tidak digaji.", "danger");
        }
    }

    updateUI();
}

function getPlayerPower() {
    return (gameState.members * 10) + (gameState.weapons * 25);
}

function getPlayerRank() {
    let currentRank = RANKS[0].name;
    for (let r of RANKS) {
        if (gameState.reputation >= r.minRep) currentRank = r.name;
    }
    return currentRank;
}

// UI RENDERING & ACTIONS
function updateUI() {
    document.getElementById('player-title').innerText = getPlayerRank();
    document.getElementById('stat-money').innerText = `Rp ${gameState.money.toLocaleString('id-ID')}`;
    document.getElementById('stat-rep').innerText = `${gameState.reputation} RP`;
    document.getElementById('stat-members').innerText = `${gameState.members} Orang`;
    document.getElementById('stat-power').innerText = `${getPlayerPower()} PWR`;
    document.getElementById('stat-heat').innerText = `${gameState.heat}%`;
    document.getElementById('heat-bar').style.width = `${gameState.heat}%`;
    document.getElementById('loan-amount').innerText = `Rp ${gameState.loan.toLocaleString('id-ID')}`;

    let passiveIncome = 0;
    BUSINESS_DATA.forEach(b => passiveIncome += (gameState.businesses[b.id] || 0) * b.income);
    TURF_DATA.forEach(t => {
        if (gameState.turfs[t.id] === 'player') passiveIncome += t.bonus;
    });
    const expenses = gameState.members * 10000;
    document.getElementById('stat-income').innerText = `${(passiveIncome - expenses) >= 0 ? '+' : ''}Rp ${(passiveIncome - expenses).toLocaleString('id-ID')}`;

    renderTurfMap();
}

// TAB NAVIGATION
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
};

// TURF MAP SYSTEM
function renderTurfMap() {
    const grid = document.getElementById('turf-map-grid');
    if (!grid) return;
    grid.innerHTML = '';

    TURF_DATA.forEach(t => {
        const owner = gameState.turfs[t.id] || 'enemy-1';
        let ownerName = "Geng Musuh";
        if (owner === 'player') ownerName = "Geng Anda";
        else {
            const r = RIVALS_DATA.find(x => x.id === owner);
            if (r) ownerName = r.name;
        }

        const card = document.createElement('div');
        card.className = `turf-card controlled-${owner}`;
        card.innerHTML = `
            <h4>${t.name}</h4>
            <div class="turf-owner">Penguasa: <strong>${ownerName}</strong></div>
            <p style="font-size: 0.8rem; color: #8c96a5;">Bonus: +Rp ${t.bonus.toLocaleString('id-ID')}/dtk</p>
            ${owner !== 'player' ? `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" onclick="reclaimTurf('${t.id}')">Rebut Wilayah</button>` : `<span class="text-green" style="font-size:0.8rem;">✔ Terkuasai</span>`}
        `;
        grid.appendChild(card);
    });
}

window.reclaimTurf = function(turfId) {
    const pwr = getPlayerPower();
    if (pwr < 50) {
        alert("Power Tempur Anda terlalu lemah untuk merebut wilayah ini (Minimal 50 PWR)!");
        return;
    }

    if (Math.random() < 0.65) {
        gameState.turfs[turfId] = 'player';
        gameState.reputation += 25;
        logMessage(`BERHASIL! Anda merebut kontrol wilayah dari geng musuh!`, 'success');
    } else {
        gameState.members = Math.max(1, gameState.members - 2);
        logMessage(`GAGAL! Serangan perebutan wilayah dibalas sengit. 2 Anggota gugur!`, 'danger');
    }
    updateUI();
};

// CRIMES & BUSINESS
function renderCrimes() {
    const container = document.getElementById('crimes-list');
    if (!container) return;
    container.innerHTML = '';
    CRIMES.forEach(c => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${c.name}</h4>
                <p>Hasil: +Rp ${c.rewardMoney.toLocaleString('id-ID')} | +${c.rewardRep} RP | +${c.heat}% Heat</p>
            </div>
            <button class="btn btn-gold" onclick="doCrime('${c.id}')">Lakukan Aksi</button>
        `;
        container.appendChild(card);
    });
}

window.doCrime = function(crimeId) {
    const crime = CRIMES.find(c => c.id === crimeId);
    if (!crime) return;

    gameState.money += crime.rewardMoney;
    gameState.reputation += crime.rewardRep;
    gameState.heat = Math.min(100, gameState.heat + crime.heat);

    logMessage(`Aksi '${crime.name}' berhasil! (+Rp ${crime.rewardMoney.toLocaleString('id-ID')})`);
    updateUI();
};

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
                <p>Pasif: +Rp ${b.income.toLocaleString('id-ID')}/dtk | Biaya: Rp ${b.cost.toLocaleString('id-ID')}</p>
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
        logMessage(`Membeli 1 unit '${b.name}'.`, 'success');
        renderBusiness();
        updateUI();
    } else {
        alert("Uang kas tidak mencukupi!");
    }
};

// RIVALS & RECRUITMENT
function renderRivals() {
    const container = document.getElementById('rivals-list');
    if (!container) return;
    container.innerHTML = '';
    RIVALS_DATA.forEach(r => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${r.name}</h4>
                <p>Kekuatan Musuh: ${r.power} PWR</p>
            </div>
            <button class="btn btn-red" onclick="attackRival('${r.id}')">Serang Markas Musuh</button>
        `;
        container.appendChild(card);
    });
}

window.buyMember = function() {
    const cost = 500000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.members++;
        logMessage("Merekrut 1 Anak Buah baru.", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.buyWeapon = function() {
    const cost = 1500000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.weapons++;
        logMessage("Membeli 1 Senjata baru.", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.attackRival = function(rivalId) {
    const rival = RIVALS_DATA.find(r => r.id === rivalId);
    const myPwr = getPlayerPower();

    if (myPwr > rival.power) {
        const loot = rival.power * 100000;
        gameState.money += loot;
        gameState.reputation += 50;
        logMessage(`SERANGAN BERHASIL! Menghancurkan ${rival.name} dan merampas Rp ${loot.toLocaleString('id-ID')}!`, 'success');
    } else {
        gameState.members = Math.max(1, gameState.members - 3);
        logMessage(`SERANGAN GAGAL! Pasukan Anda terpukul mundur oleh ${rival.name}. 3 Pasukan gugur.`, 'danger');
    }
    updateUI();
};

// LOAN & BRIBE
window.takeLoan = function(amount) {
    gameState.loan += amount;
    gameState.money += amount;
    logMessage(`Mengambil pinjaman Rp ${amount.toLocaleString('id-ID')} dari Rentenir.`, 'danger');
    updateUI();
};

window.payLoan = function() {
    if (gameState.money >= gameState.loan) {
        gameState.money -= gameState.loan;
        gameState.loan = 0;
        logMessage("Hutang rentenir berhasil dilunasi!", 'success');
    } else {
        alert("Uang kas tidak cukup untuk melunasi hutang!");
    }
    updateUI();
};

window.bribePolice = function() {
    const cost = 5000000;
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.heat = Math.max(0, gameState.heat - 20);
        logMessage("Menyuap oknum aparat. Heat Level berkurang -20%.", 'success');
        updateUI();
    } else alert("Uang tidak cukup untuk bayar suap!");
};

// RANDOM EVENTS
function triggerRandomEvent() {
    if (!currentUser) return;
    const events = [
        {
            title: "PENGGEREBEKAN APARAT!",
            desc: "Polisi mendatangi salah satu markas bisnis Anda!",
            choices: [
                { text: "Bayar Uang Damai (Rp 2.000.000)", action: () => { gameState.money = Math.max(0, gameState.money - 2000000); } },
                { text: "Kabur & Pasrah (Heat +15%)", action: () => { gameState.heat = Math.min(100, gameState.heat + 15); } }
            ]
        },
        {
            title: "TAWARAN PENCUCIAN UANG",
            desc: "Seorang pengusaha menawarkan kerja sama pencucian uang instan.",
            choices: [
                { text: "Terima (+Rp 10.000.000, Heat +10%)", action: () => { gameState.money += 10000000; gameState.heat += 10; } },
                { text: "Tolak Tawaran", action: () => {} }
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

// LOGGING
function logMessage(msg, type = '') {
    const logs = document.getElementById('game-logs');
    if (!logs) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logs.appendChild(entry);
}
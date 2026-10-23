import { 
    auth, 
    db, 
    fetchGlobalOccupiedCities, 
    claimBasecampGlobal, 
    updateCityOccupantGlobal,
    loadUserDataFromCloud, 
    saveUserDataToCloud, 
    fetchLeaderboardData,
    fetchGlobalPilkadaData,
    saveGlobalPilkadaData,
    fetchNationalNewsData,
    saveNationalNewsData,
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "./firebase-db.js";

import { 
    PROVINCES, 
    GLOBAL_TARGETS, 
    CRIMES_DATA, 
    BUSINESS_DATA, 
    ALL_EXPEDITION_MASTER, 
    OFFICERS_MASTER, 
    EVENTS_MASTER 
} from "./config.js";

// WEB AUDIO SYNTHESIZER
class AudioSynth {
    constructor() { this.ctx = null; }
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    playSuccess() {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.3);
    }
    playDanger() {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, now); osc.frequency.setValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.35);
    }
    playSiren() {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.linearRampToValueAtTime(900, now + 0.25);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.6);
    }
    playWarDrum() {
        this.init(); if (!this.ctx) return;
        const now = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        gain.gain.setValueAtTime(0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.4);
    }
}

const audioFX = new AudioSynth();

// MASTER KONTRAK MISI STORY CAMPAIGN
const STORY_CONTRACTS_MASTER = [
    { id: 'c1', reqRep: 0, title: 'TIER 1: Amankan Wilayah Basecamp', desc: 'Selesaikan pendaftaran basecamp dan rekrut minimal 3 Pasukan Markas.', reqMembers: 3, rewardCash: 10000000, rewardRep: 30 },
    { id: 'c2', reqRep: 0, title: 'TIER 1: Operasi Pelabuhan Kecil', desc: 'Kuasai minimal 2 kota di Indonesia untuk jalur distribusi awal.', reqCities: 2, rewardCash: 15000000, rewardRep: 50 },
    { id: 'c3', reqRep: 70, title: 'TIER 2: Gudang Persenjataan Kartel', desc: 'Miliki minimal 4 Senjata dan total kekuatan markas di atas 150 PWR.', reqWeapons: 4, reqPwr: 150, rewardCash: 25000000, rewardRep: 80 },
    { id: 'c4', reqRep: 70, title: 'TIER 2: Ekspansi Wilayah Pesisir', desc: 'Kuasai minimal 5 kota di Indonesia.', reqCities: 5, rewardCash: 35000000, rewardRep: 100 },
    { id: 'c5', reqRep: 200, title: 'TIER 3: Suntikan Modal Pilkada', desc: 'Suntik modal politik Pilkada minimal Rp 10 Juta untuk paslon mana pun.', reqPilkadaContrib: 10000000, rewardCash: 50000000, rewardRep: 150 },
    { id: 'c6', reqRep: 200, title: 'TIER 3: Perekrutan Perwira Unik', desc: 'Rekrut minimal 1 Perwira Unik untuk memimpin operasi kriminal.', reqOfficersCount: 1, rewardCash: 60000000, rewardRep: 180 },
    { id: 'c7', reqRep: 200, title: 'TIER 3: Penguasa Jalur Pantura', desc: 'Kuasai minimal 8 kota di Indonesia dan raih total kekuatan 450 PWR.', reqCities: 8, reqPwr: 450, rewardCash: 80000000, rewardRep: 220 },
    { id: 'c8', reqRep: 550, title: 'TIER 4: Monarch Bisnis Haram', desc: 'Miliki minimal 5 Aset Bisnis Haram jenis apa saja.', reqBizCount: 5, rewardCash: 120000000, rewardRep: 300 },
    { id: 'c9', reqRep: 550, title: 'TIER 4: Benteng Garnisun Tangguh', desc: 'Tempatkan minimal 10 Pasukan di Garnisun kota-kota milik Anda.', reqGarrisonMembers: 10, rewardCash: 150000000, rewardRep: 350 },
    { id: 'c10', reqRep: 550, title: 'TIER 4: Penakluk Seluruh Nusantara', desc: 'Kuasai minimal 15 kota di Indonesia.', reqCities: 15, rewardCash: 200000000, rewardRep: 400 },
    { id: 'c11', reqRep: 1200, title: 'TIER 5: Penguasa Pasar Gelap Dunia', desc: 'Taklukkan minimal 1 Kartel Internasional di tab Ekspansi.', reqGlobalCount: 1, rewardCash: 350000000, rewardRep: 500 },
    { id: 'c12', reqRep: 1200, title: 'TIER 5: Don Sindikat Supreme', desc: 'Raih gelar Don Sindikat Indonesia (Kuasai 30 Kota & 3.000 PWR).', reqCities: 30, reqPwr: 3000, rewardCash: 1000000000, rewardRep: 1000 }
];

// MASTER RIVAL AI BOSS ENGINE (DENGAN ILUSTRASI)
let aiRivalBosses = [
    { id: 'pantura', name: 'Geng Pantura (Sutrisno)', level: 3, pwr: 250, desc: 'Menguasai jalur logistik pesisir utara.', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80', isRevealed: false },
    { id: 'belawan', name: 'Sindikat Belawan (Bakar)', level: 4, pwr: 400, desc: 'Penyelundup senjata tajam & gelap Sumatra.', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80', isRevealed: false },
    { id: 'celebes', name: 'Kartel Celebes (Daeng Rawa)', level: 5, pwr: 650, desc: 'Jaringan perdagangan komoditas rahasia timur.', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&q=80', isRevealed: false }
];

// GAMBAR ILUSTRASI TAMBAHAN
const BUSINESS_IMAGES = {
    'parkir_liar': 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=500&q=80',
    'judol_server': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80',
    'distribusi_rokok': 'https://images.unsplash.com/photo-1527181152855-fc03fc7949c8?w=500&q=80',
    'tambang_ilegal': 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=500&q=80'
};

const OFFICER_IMAGES = {
    'akbp_hendro': 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&q=80',
    'bambang_lintah': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&q=80',
    'siti_mawar': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=80'
};

const PASLON_IMAGES = {
    1: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80',
    2: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&q=80',
    3: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&q=80'
};

function createDefaultGameState() {
    return {
        setupDone: false,
        username: '',
        homeProvince: 'dki',
        homeCity: 'Jakarta Pusat',
        money: 5000000,
        weapons: 0,
        heat: 0,
        reputation: 0,
        isJailed: false,
        jailTimerSec: 0,
        jailTimesCount: 0,
        members: [],
        jailedMembers: [],
        cityGarrisons: {},
        officers: {},
        businesses: {},
        controlledCities: {},
        controlledGlobal: {},
        activeExpedition: null,
        availableExpeditions: [],
        activeCrime: null,
        activeAiAttacks: [],
        activePvPWars: [],
        incomingPvPAttack: [],
        completedContracts: {},
        expeditionCountToday: 0,
        lastExpeditionDate: '',
        peaceShieldUntil: 0,
        isBusinessClosedTimer: 0,
        gameLogs: []
    };
}

let currentUser = null;
let currentAuthMode = 'login';
let gameState = createDefaultGameState();
let payoutCountdownSec = 60;
let currentActiveEvent = null;
let eventTimerSec = 20;
let globalOccupiedMap = {};
let nationalNewsFeed = [];
let newsLastUpdateTs = Date.now();

// INTERVAL KORAN & AI DYNAMIC SCALING DIUBAH JADI 5 MENIT (300.000 MS)
const NEWS_INTERVAL_MS = 5 * 60 * 1000;

let globalPilkada = {
    phase: 'KAMPANYE',
    phaseEndTime: Date.now() + (10 * 60 * 60 * 1000),
    paslon: [
        { id: 1, name: 'H. Syamsul - Ormas Pesisir', desc: 'Pertahanan Kota +30%', totalFund: 0, usersContrib: {} },
        { id: 2, name: 'Kombes (Purn) M. Yasin', desc: 'Heat Level Turun 2x Cepat & Diskon Suap 50%', totalFund: 0, usersContrib: {} },
        { id: 3, name: 'Drs. Hartono - Pengusaha', desc: 'Pendapatan Bisnis Haram +25%', totalFund: 0, usersContrib: {} }
    ],
    winnerId: null,
    newsFeed: ['Pilkada Serentak Resmi Dibuka! Para paslon mulai menggalang dana modal politik.']
};

let pendingAttackCityTarget = null;
let pendingAttackType = 'ai';
let currentGarrisonCityTarget = null;
let jailMiniGamePattern = [];
let jailMiniGameUserIdx = 0;

// SUB NAV CONFIG MAP
const CATEGORY_SUB_NAVS = {
    domain: [
        { id: 'tab-map', label: '🗺️ Peta MMO' },
        { id: 'tab-garrison', label: '🛡️ Garnisun Kota' },
        { id: 'tab-global', label: '✈️ Internasional' }
    ],
    business: [
        { id: 'tab-biz', label: '🏢 Bisnis Haram' },
        { id: 'tab-expedition', label: '🚚 Ekspedisi' },
        { id: 'tab-crimes', label: '🔪 Aksi Kriminal' }
    ],
    military: [
        { id: 'tab-troops', label: '⚔️ Pasukan Markas' },
        { id: 'tab-officers', label: '🎖️ Perwira' },
        { id: 'tab-rivals', label: '🕵️ Rival AI Boss' }
    ],
    politics: [
        { id: 'tab-news', label: '📰 Koran Berita' },
        { id: 'tab-pilkada', label: '🏛️ Beking Pilkada' },
        { id: 'tab-social', label: '🤝 Ormas & Suap' }
    ],
    contracts: [
        { id: 'tab-bounty', label: '📜 Misi Cerita' },
        { id: 'tab-leaderboard', label: '🏆 Leaderboard' }
    ]
};

let activeCategory = 'domain';

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    // Tampilkan modal auth saat pertama kali dibuka
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.remove('hidden');

    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('setup-modal').classList.add('hidden');

    setupAuthListeners();
    populateSetupSelects();

    setInterval(secondTicker, 1000);
    setInterval(cloudAutosaveInterval, 15000);
    rotateExpeditionMissions();
    setInterval(rotateExpeditionMissions, 30000);
    scheduleNextRandomEvent();
});

// AUTH SYSTEM
function setupAuthListeners() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            gameState = createDefaultGameState();
            globalOccupiedMap = await fetchGlobalOccupiedCities();

            const newsData = await fetchNationalNewsData();
            nationalNewsFeed = newsData.feed || [];
            newsLastUpdateTs = newsData.lastUpdateTs || Date.now();
            await checkAndCatchUpOfflineNews();

            document.getElementById('auth-modal').classList.add('hidden');
            const cloudData = await loadUserDataFromCloud(user.uid);
            if (cloudData) gameState = { ...createDefaultGameState(), ...cloudData };

            gameState.username = user.email.split('@')[0];

            const cloudPilkada = await fetchGlobalPilkadaData();
            if (cloudPilkada) globalPilkada = cloudPilkada;

            // Recovery Timer Perang Offline (2 Menit)
            const now = Date.now();
            if (gameState.activeAiAttacks) {
                gameState.activeAiAttacks.forEach(atk => {
                    if (now >= atk.endTime) {
                        gameState.controlledCities[atk.cityName] = true;
                    }
                });
                gameState.activeAiAttacks = gameState.activeAiAttacks.filter(atk => now < atk.endTime);
            }

            if (!gameState.setupDone) {
                document.getElementById('setup-modal').classList.remove('hidden');
                document.getElementById('game-container').classList.add('hidden');
            } else {
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('game-container').classList.remove('hidden');
                switchCategory('domain');
                initUI();
                renderLogs();

                checkIncomingPvPDefenseModal();
            }
        } else {
            currentUser = null;
            gameState = createDefaultGameState();
            document.getElementById('auth-modal').classList.add('hidden');
            document.getElementById('game-container').classList.add('hidden');
            document.getElementById('setup-modal').classList.add('hidden');
        }
    });
}

window.switchAuthTab = function(mode) {
    currentAuthMode = mode;
    document.getElementById('tab-login-btn').className = mode === 'login' ? 'active' : '';
    document.getElementById('tab-register-btn').className = mode === 'register' ? 'active' : '';
    document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'MASUK KE DUNIA HITAM' : 'DAFTAR KARTEL BARU';
};

window.handleAuthSubmit = async function(e) {
    e.preventDefault();
    audioFX.playSuccess();
    const usernameInput = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const errorEl = document.getElementById('auth-error');
    errorEl.innerText = "";

    if (!usernameInput || !password) {
        errorEl.innerText = "Username dan Password wajib diisi!";
        return;
    }

    const email = `${usernameInput.toLowerCase()}@mafia.mmo`;

    try {
        if (currentAuthMode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            await cloudAutosaveInterval();
        }
    } catch (err) {
        console.error("Auth Error Code:", err.code);
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            errorEl.innerText = "Gagal masuk: Username atau kata sandi salah.";
        } else if (err.code === 'auth/email-already-in-use') {
            errorEl.innerText = "Username sudah digunakan akun lain.";
        } else if (err.code === 'auth/weak-password') {
            errorEl.innerText = "Kata sandi terlalu lemah (minimal 6 karakter).";
        } else {
            errorEl.innerText = "Error: " + err.message;
        }
    }
};

window.logout = function() { signOut(auth).catch((err) => console.error("SignOut error:", err)); };

// NAVIGASI KATEGORI & SUB TAB
window.switchCategory = function(catKey) {
    activeCategory = catKey;
    document.querySelectorAll('.category-group').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`cat-${catKey}`).classList.add('active');
    
    const navBtnIndex = ['domain', 'business', 'military', 'politics', 'contracts'].indexOf(catKey);
    const navBtns = document.querySelectorAll('.nav-btn');
    if (navBtns[navBtnIndex]) navBtns[navBtnIndex].classList.add('active');

    renderSubNavBar(catKey);
};

function renderSubNavBar(catKey) {
    const container = document.getElementById('sub-nav-bar');
    if (!container) return;
    container.innerHTML = '';

    const subTabs = CATEGORY_SUB_NAVS[catKey] || [];
    subTabs.forEach((st, idx) => {
        const btn = document.createElement('button');
        btn.className = `sub-nav-btn ${idx === 0 ? 'active' : ''}`;
        btn.innerText = st.label;
        btn.onclick = () => switchSubTab(catKey, st.id, btn);
        container.appendChild(btn);
    });

    if (subTabs.length > 0) {
        switchSubTab(catKey, subTabs[0].id, container.children[0]);
    }
}

function switchSubTab(catKey, subTabId, btnEl) {
    const parentGroup = document.getElementById(`cat-${catKey}`);
    if (!parentGroup) return;

    parentGroup.querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sub-nav-btn').forEach(el => el.classList.remove('active'));

    const targetSubTab = document.getElementById(subTabId);
    if (targetSubTab) targetSubTab.classList.add('active');
    if (btnEl) btnEl.classList.add('active');

    if (subTabId === 'tab-leaderboard') renderLeaderboard();
    if (subTabId === 'tab-pilkada') renderPilkadaUI();
    if (subTabId === 'tab-news') renderNationalNewspaper();
    if (subTabId === 'tab-bounty') renderContractsUI();
    if (subTabId === 'tab-garrison') renderGarrisonCitiesGrid();
    if (subTabId === 'tab-rivals') renderAiBossList();
}

// SETUP BASECAMP
async function populateSetupSelects() {
    globalOccupiedMap = await fetchGlobalOccupiedCities();
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
            const occupant = globalOccupiedMap[c];
            if (occupant) {
                opt.innerText = `${c} [Diklaim: ${occupant.username}]`;
                opt.disabled = true;
            } else {
                opt.innerText = `${c} (Kosong)`;
            }
            cSelect.appendChild(opt);
        });
    }
};

window.submitInitialSetup = async function() {
    const pId = document.getElementById('setup-province-select').value;
    const cName = document.getElementById('setup-city-select').value;
    const username = gameState.username;

    const result = await claimBasecampGlobal(cName, currentUser.uid, username);
    if (!result.success) {
        alert(result.message);
        populateSetupSelects();
        return;
    }

    gameState.homeProvince = pId;
    gameState.homeCity = cName;
    gameState.controlledCities = {};
    gameState.controlledCities[cName] = true;

    gameState.members = [
        { id: Date.now() + 1, power: Math.floor(Math.random() * 5) + 1 },
        { id: Date.now() + 2, power: Math.floor(Math.random() * 5) + 1 }
    ];

    gameState.setupDone = true;

    document.getElementById('setup-modal').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    logMessage(`Basecamp didirikan di ${cName}. Selamat berjuang, Boss!`, 'success');
    await cloudAutosaveInterval();
    initUI();
};

async function cloudAutosaveInterval() {
    if (!currentUser || !gameState.setupDone) return;
    await saveUserDataToCloud(currentUser.uid, gameState);
}

// TICKER UTAMA PER DETIK
function secondTicker() {
    if (!currentUser || !gameState.setupDone) return;

    const lockOverlay = document.getElementById('lockdown-overlay');
    if (gameState.isBusinessClosedTimer > 0) {
        gameState.isBusinessClosedTimer--;
        if (lockOverlay) {
            lockOverlay.classList.remove('hidden');
            document.getElementById('lockdown-timer-count').innerText = gameState.isBusinessClosedTimer;
        }
    } else {
        if (lockOverlay) lockOverlay.classList.add('hidden');
    }

    payoutCountdownSec--;
    const timerEl = document.getElementById('stat-timer-60s');
    if (timerEl) timerEl.innerText = `${payoutCountdownSec}s`;

    if (payoutCountdownSec <= 0) {
        payoutCountdownSec = 60;
        if (!gameState.isJailed && gameState.isBusinessClosedTimer <= 0) {
            const income = calculateTotalIncome1Min();
            const expenses = calculateTotalExpenses1Min();
            const net = income - expenses;
            gameState.money += net;

            if (gameState.money < 0) {
                gameState.money = 0;
                if (gameState.members.length > 0 && Math.random() < 0.4) {
                    removeRandomMembers(1, 2);
                    setAssistantMessage("Kas minus! Beberapa pasukan kabur karena gaji menunggak.");
                }
            }
        }
    }

    checkAndCatchUpOfflineNews();
    updateNewsCountdownDisplay();

    jailTicker();
    expeditionTicker();
    crimeSingleTicker();
    eventModalTimerTicker();
    aiAttacksTicker();
    pvpWarsTicker();
    pilkadaTicker();
    randomAiRetaliationCheck();
    updateUI();
}

function calculateTotalIncome1Min() {
    if (gameState.isBusinessClosedTimer > 0) return 0;
    let income = 0;
    BUSINESS_DATA.forEach(b => {
        income += (gameState.businesses[b.id] || 0) * b.income;
    });

    if (globalPilkada.winnerId === 3) income *= 1.25;

    const controlledCount = Object.keys(gameState.controlledCities).length;
    let cityBaseIncome = controlledCount * 1000000;

    if (gameState.heat >= 70) cityBaseIncome *= 0.5;

    income += cityBaseIncome;

    GLOBAL_TARGETS.forEach(g => {
        if (gameState.controlledGlobal[g.id]) income += g.rewardPerMin;
    });
    return income;
}

function calculateTotalExpenses1Min() {
    let baseExpense = (gameState.members || []).length * 50000;
    if (gameState.officers['bambang_lintah']) baseExpense *= 0.8;
    return baseExpense;
}

function getPlayerTotalPower() {
    let pwr = (gameState.weapons || 0) * 25;
    (gameState.members || []).forEach(m => pwr += (m.power || 0));
    return pwr;
}

function getCityGarrisonPower(cityName) {
    const gar = (gameState.cityGarrisons && gameState.cityGarrisons[cityName]) ? gameState.cityGarrisons[cityName] : null;
    if (!gar) return 0;
    let pwr = (gar.weapons || 0) * 25;
    (gar.members || []).forEach(m => pwr += (m.power || 0));
    return pwr;
}

function getNextJailDurationSec() {
    const times = gameState.jailTimesCount || 0;
    return Math.floor(120 * Math.pow(1.5, times));
}

function checkAllIndoAICleared() {
    let totalAICities = 0;
    PROVINCES.forEach(p => totalAICities += p.cities.length);
    const playerControlledCount = Object.keys(gameState.controlledCities).length;
    return playerControlledCount >= totalAICities;
}

function isWarInProgress() {
    const activeAi = (gameState.activeAiAttacks && gameState.activeAiAttacks.length > 0);
    const activePvp = (gameState.activePvPWars && gameState.activePvPWars.length > 0);
    return activeAi || activePvp;
}

function initUI() {
    populateProvinceViewSelect();
    renderCrimes();
    renderBusiness();
    renderOfficers();
    renderExpeditions();
    renderGlobalTargets();
    renderLeaderboard();
    renderPilkadaUI();
    renderNationalNewspaper();
    renderContractsUI();
    renderGarrisonCitiesGrid();
    renderAiBossList();
    updateUI();
}

async function updateUI() {
    if (!gameState.setupDone) return;

    globalOccupiedMap = await fetchGlobalOccupiedCities();

    document.getElementById('user-display-name').innerText = gameState.username;
    document.getElementById('player-location-badge').innerText = `Basecamp: ${gameState.homeCity}`;
    document.getElementById('player-rep-badge').innerText = `Reputasi: ${gameState.reputation || 0} REP`;

    const totalCities = Object.keys(gameState.controlledCities).length;
    const myPwr = getPlayerTotalPower();
    let rankTitle = "Preman Pasar";
    if (myPwr >= 3000 && totalCities >= 30) rankTitle = "Don Sindikat Indonesia";
    else if (myPwr >= 1500 && totalCities >= 15) rankTitle = "Ketua Kartel Lintas Pulau";
    else if (myPwr >= 450 && totalCities >= 6) rankTitle = "Bos Ormas Wilayah";
    else if (myPwr >= 150) rankTitle = "Kepala Keamanan Daerah";

    document.getElementById('player-title').innerText = `${rankTitle} ℹ️`;

    const income = calculateTotalIncome1Min();
    const expenses = calculateTotalExpenses1Min();

    document.getElementById('stat-money').innerText = `Rp ${gameState.money.toLocaleString('id-ID')}`;
    document.getElementById('stat-income').innerText = `+Rp ${income.toLocaleString('id-ID')}`;
    document.getElementById('stat-expenses').innerText = `-Rp ${expenses.toLocaleString('id-ID')}`;
    document.getElementById('stat-members').innerText = `${(gameState.members || []).length} Orang`;
    document.getElementById('stat-power').innerText = `${myPwr} PWR`;

    const heatVal = gameState.heat || 0;
    let heatText = `${heatVal}% (Aman)`;
    if (heatVal >= 70) heatText = `${heatVal}% 🚨 BURONAN POLDA`;
    else if (heatVal >= 40) heatText = `${heatVal}% ⚠️ WASPADA`;

    document.getElementById('stat-heat').innerText = heatText;
    document.getElementById('heat-bar').style.width = `${heatVal}%`;

    renderTurfMap();
    renderMembersList();
    renderJailedMembersList();
    renderGlobalTargets();
}

function setAssistantMessage(msg) {
    const el = document.getElementById('assistant-message');
    if (el) el.innerText = `"${msg}"`;
}

// KORAN BERITA NASIONAL & DYNAMIC AI SCALING TIAP 5 MENIT (BERDASARKAN SERVER POWER)
async function checkAndCatchUpOfflineNews() {
    const now = Date.now();
    const elapsedMs = now - newsLastUpdateTs;

    if (elapsedMs >= NEWS_INTERVAL_MS || nationalNewsFeed.length === 0) {
        const missedCycles = Math.max(1, Math.floor(elapsedMs / NEWS_INTERVAL_MS));
        const iterations = Math.min(10, missedCycles);

        for (let i = 0; i < iterations; i++) {
            await generateSingleNewsItem();
        }

        newsLastUpdateTs = now;
        await saveNationalNewsData(nationalNewsFeed, newsLastUpdateTs);
        renderNationalNewspaper();
        renderAiBossList();
    }
}

async function generateSingleNewsItem() {
    let avgPlayerPower = 150; 
    let maxPlayerPower = 300; 

    try {
        const players = await fetchLeaderboardData();
        if (players && players.length > 0) {
            let totalPowerSum = 0;
            let highestPwr = 0;

            players.forEach(p => {
                const pwrEst = (p.cities * 50) + Math.floor(p.money / 10000000);
                totalPowerSum += pwrEst;
                if (pwrEst > highestPwr) highestPwr = pwrEst;
            });

            avgPlayerPower = Math.max(100, Math.floor(totalPowerSum / players.length));
            maxPlayerPower = Math.max(200, highestPwr);
        }
    } catch (err) {
        console.warn("Gagal mengambil data power pemain untuk AI scaling:", err);
    }

    aiRivalBosses.forEach(b => {
        let targetBasePower = 200;

        if (b.id === 'pantura') {
            const fluctuation = (Math.random() * 0.3) - 0.15; 
            targetBasePower = Math.floor(avgPlayerPower * (1 + fluctuation));
        } else if (b.id === 'belawan') {
            const fluctuation = (Math.random() * 0.2) - 0.10; 
            targetBasePower = Math.floor((maxPlayerPower * 0.8) * (1 + fluctuation));
        } else if (b.id === 'celebes') {
            const fluctuation = (Math.random() * 0.2) - 0.05; 
            targetBasePower = Math.floor((maxPlayerPower * 1.15) * (1 + fluctuation));
        }

        b.pwr = Math.max(120, targetBasePower);

        if (b.pwr > 1000) b.level = 6;
        else if (b.pwr > 600) b.level = 5;
        else if (b.pwr > 350) b.level = 4;
        else b.level = 3;
    });

    const headlinesPool = [
        `🚨 PERGERAKAN RIVAL: ${aiRivalBosses[0].name} menyesuaikan kekuatan pasukannya menjadi ${aiRivalBosses[0].pwr} PWR!`,
        `📈 BURSA GELAP: Kelangkaan senjata impor membuat harga pasar gelap naik pesat!`,
        `⚔️ AMBISI KARTEL: ${aiRivalBosses[2].name} mengumpulkan persenjataan berat! Total Power kini mencapai ${aiRivalBosses[2].pwr} PWR.`,
        `🏛️ HOT PILKADA: Modal politik anonim mendominasi elektabilitas suara calon gubernur.`,
        `🚚 BEA CUKAI: Armada penyelundupan rokok ilegal berhasil disergap petugas di selat pulau.`
    ];

    const chosenDesc = headlinesPool[Math.floor(Math.random() * headlinesPool.length)];
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newEntry = {
        title: "KORAN WARTA UNDERWORLD NASIONAL",
        time: timeStr,
        desc: chosenDesc
    };

    nationalNewsFeed.unshift(newEntry);
    if (nationalNewsFeed.length > 10) {
        nationalNewsFeed = nationalNewsFeed.slice(0, 10);
    }
}

function updateNewsCountdownDisplay() {
    const timerEl = document.getElementById('news-countdown-timer');
    if (!timerEl) return;

    const nextReleaseTs = newsLastUpdateTs + NEWS_INTERVAL_MS;
    const remainingMs = Math.max(0, nextReleaseTs - Date.now());

    const totalSec = Math.floor(remainingMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;

    timerEl.innerText = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}s`;
}

function renderNationalNewspaper() {
    const container = document.getElementById('national-newspaper-feed');
    if (!container) return;
    container.innerHTML = '';

    if (!nationalNewsFeed || nationalNewsFeed.length === 0) {
        container.innerHTML = '<p class="text-muted">Memuat warta koran nasional...</p>';
        return;
    }

    nationalNewsFeed.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'news-item';
        div.innerHTML = `
            <h5>#${idx+1} ${item.title}</h5>
            <small>Terbit Pukul: ${item.time} WIB</small>
            <p>${item.desc}</p>
        `;
        container.appendChild(div);
    });
}

// RIVAL AI BOSS ENGINE (DENGAN SADAP INTELEJEN & ILUSTRASI FOTO)
function renderAiBossList() {
    const grid = document.getElementById('ai-boss-list-grid');
    if (!grid) return;
    grid.innerHTML = '';

    aiRivalBosses.forEach(b => {
        const card = document.createElement('div');
        card.className = 'game-card controlled-enemy';
        card.innerHTML = `
            <div>
                <img src="${b.img}" class="card-img-banner" alt="${b.name}">
                <h4>${b.name} <span class="text-yellow">[Lvl ${b.level}]</span></h4>
                <p>${b.desc}</p>
                <p>Estimasi Power AI: <strong class="${b.isRevealed ? 'text-red' : 'text-yellow'}">${b.isRevealed ? b.pwr + ' PWR' : '??? PWR (Butuh Sadap)'}</strong></p>
            </div>
            <button class="btn btn-blue btn-xs" onclick="sadapAiBoss('${b.id}')">SADAP INTELIJEN (Rp 5Jt)</button>
        `;
        grid.appendChild(card);
    });
}

window.sadapAiBoss = function(bossId) {
    if (gameState.money >= 5000000) {
        audioFX.playSuccess();
        gameState.money -= 5000000;
        const b = aiRivalBosses.find(x => x.id === bossId);
        if (b) b.isRevealed = true;
        alert(`INTELIJEN TERBUNGKUS: ${b.name} saat ini memiliki ${b.pwr} PWR. Pasukan mereka bersiap melancarkan ekspansi!`);
        logMessage(`Berhasil menyadap intelijen ${b.name} (${b.pwr} PWR).`, 'success');
        renderAiBossList();
        updateUI();
    } else alert("Uang kas tidak cukup (Butuh Rp 5 Juta)!");
};

// LEADERBOARD DATA FETCH
async function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Memuat data peringkat real-time...</td></tr>';

    try {
        const players = await fetchLeaderboardData();
        tbody.innerHTML = '';

        if (!players || players.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada data pemain lain terdaftar.</td></tr>';
            return;
        }

        players.forEach((p, idx) => {
            const tr = document.createElement('tr');
            const isMe = p.uid === currentUser.uid;

            tr.innerHTML = `
                <td><strong>#${idx + 1}</strong></td>
                <td>${p.username} ${isMe ? '<span class="text-green">(Anda)</span>' : ''}</td>
                <td><strong class="text-yellow">${p.cities} Kota</strong></td>
                <td><strong class="text-green">Rp ${p.money.toLocaleString('id-ID')}</strong></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Leaderboard UI Error:", err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--red);">Gagal memuat papan peringkat. Silakan coba lagi.</td></tr>';
    }
}

// GARNISUN KOTA & SERANGAN BALIK AI DINAMIS
function renderGarrisonCitiesGrid() {
    const grid = document.getElementById('garrison-cities-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const myCities = Object.keys(gameState.controlledCities || {});
    if (myCities.length === 0) {
        grid.innerHTML = '<p class="text-muted">Anda belum menguasai kota mana pun.</p>';
        return;
    }

    myCities.forEach(cName => {
        const gar = gameState.cityGarrisons[cName] || { members: [], weapons: 0 };
        const garPwr = getCityGarrisonPower(cName);

        const card = document.createElement('div');
        card.className = 'game-card controlled-player';
        card.innerHTML = `
            <div>
                <h4>${cName}</h4>
                <p>Pasukan Garnisun: <strong>${gar.members.length} Orang</strong></p>
                <p>Senjata Garnisun: <strong>${gar.weapons} Unit</strong></p>
                <p>Total Power Pertahanan: <strong class="text-green">${garPwr} PWR</strong></p>
            </div>
            <button class="btn btn-gold btn-xs" onclick="openGarrisonModal('${cName}')">Kelola Garnisun Kota</button>
        `;
        grid.appendChild(card);
    });
}

window.openGarrisonModal = function(cityName) {
    currentGarrisonCityTarget = cityName;
    const modal = document.getElementById('garrison-modal');
    if (!modal) return;

    if (!gameState.cityGarrisons[cityName]) {
        gameState.cityGarrisons[cityName] = { members: [], weapons: 0 };
    }

    document.getElementById('garrison-city-title').innerText = `Kota: ${cityName}`;
    updateGarrisonModalUI();
    modal.classList.remove('hidden');
};

function updateGarrisonModalUI() {
    if (!currentGarrisonCityTarget) return;
    const gar = gameState.cityGarrisons[currentGarrisonCityTarget];
    const garPwr = getCityGarrisonPower(currentGarrisonCityTarget);

    document.getElementById('garrison-current-members').innerText = `${gar.members.length} Orang`;
    document.getElementById('garrison-current-weapons').innerText = `${gar.weapons} Unit`;
    document.getElementById('garrison-current-pwr').innerText = `${garPwr} PWR`;

    document.getElementById('garrison-base-members').innerText = (gameState.members || []).length;
    document.getElementById('garrison-base-weapons').innerText = gameState.weapons || 0;
}

window.transferGarrisonMember = function(action) {
    if (!currentGarrisonCityTarget) return;
    const gar = gameState.cityGarrisons[currentGarrisonCityTarget];
    const count = parseInt(document.getElementById('garrison-input-members').value) || 0;
    if (count <= 0) return;

    if (action === 'add') {
        if ((gameState.members || []).length < count) { alert("Pasukan di Markas tidak cukup!"); return; }
        for (let i = 0; i < count; i++) {
            const m = gameState.members.pop();
            gar.members.push(m);
        }
    } else {
        if (gar.members.length < count) { alert("Pasukan di Garnisun tidak cukup!"); return; }
        for (let i = 0; i < count; i++) {
            const m = gar.members.pop();
            gameState.members.push(m);
        }
    }
    audioFX.playSuccess();
    updateGarrisonModalUI();
    renderGarrisonCitiesGrid();
    updateUI();
};

window.transferGarrisonWeapon = function(action) {
    if (!currentGarrisonCityTarget) return;
    const gar = gameState.cityGarrisons[currentGarrisonCityTarget];
    const count = parseInt(document.getElementById('garrison-input-weapons').value) || 0;
    if (count <= 0) return;

    if (action === 'add') {
        if ((gameState.weapons || 0) < count) { alert("Senjata di Markas tidak cukup!"); return; }
        gameState.weapons -= count;
        gar.weapons += count;
    } else {
        if (gar.weapons < count) { alert("Senjata di Garnisun tidak cukup!"); return; }
        gar.weapons -= count;
        gameState.weapons += count;
    }
    audioFX.playSuccess();
    updateGarrisonModalUI();
    renderGarrisonCitiesGrid();
    updateUI();
};

window.closeGarrisonModal = function() {
    document.getElementById('garrison-modal').classList.add('hidden');
    currentGarrisonCityTarget = null;
};

// SERANGAN BALIK RIVAL AI KE KOTA PEMAIN (SINKRONISASI KOTA JATUH)
function randomAiRetaliationCheck() {
    const myCities = Object.keys(gameState.controlledCities || {});
    if (myCities.length <= 1) return;

    if (Math.random() < 0.0008) {
        const targetCity = myCities[Math.floor(Math.random() * myCities.length)];
        if (targetCity === gameState.homeCity) return;

        const garPwr = getCityGarrisonPower(targetCity);
        const aiAttackPwr = Math.floor(Math.random() * 250) + 120;

        if (garPwr >= aiAttackPwr) {
            audioFX.playSuccess();
            logMessage(`SERANGAN AI DIPUKUL MUNDUR: Rival AI gagal merebut ${targetCity}! Power Garnisun Anda (${garPwr} PWR) menang.`, 'success');
        } else {
            audioFX.playDanger();
            delete gameState.controlledCities[targetCity];
            delete gameState.cityGarrisons[targetCity];
            
            updateCityOccupantGlobal(targetCity, null, '');

            logMessage(`KOTA JATUH KEMBALI KE AI: Kota ${targetCity} berhasil direbut Rival AI! Garnisun (${garPwr} PWR) kalah lawan AI (${aiAttackPwr} PWR).`, 'danger');
            updateUI();
        }
    }
}

// RENDER MISI STORY CAMPAIGN BERTIENGKAT
function renderContractsUI() {
    const grid = document.getElementById('contracts-list-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const currentRep = gameState.reputation || 0;

    STORY_CONTRACTS_MASTER.forEach(c => {
        const isDone = gameState.completedContracts && gameState.completedContracts[c.id];
        const isLockedByRep = currentRep < (c.reqRep || 0);

        const card = document.createElement('div');
        card.className = `game-card ${isDone ? 'controlled-player' : ''}`;
        
        if (isLockedByRep) {
            card.style.opacity = '0.5';
            card.innerHTML = `
                <div>
                    <h4 class="text-muted">🔒 ${c.title} (Terkunci)</h4>
                    <p class="text-red">Butuh Reputasi Underworld: ${c.reqRep} REP (Reputasi Anda: ${currentRep} REP)</p>
                </div>
                <button class="btn btn-gold" disabled>Terkunci</button>
            `;
        } else {
            card.innerHTML = `
                <div>
                    <h4>${c.title}</h4>
                    <p>${c.desc}</p>
                    <p>Hadiah: <span class="text-green">Rp ${c.rewardCash.toLocaleString('id-ID')}</span> | <span class="text-yellow">+${c.rewardRep} REP</span></p>
                </div>
                ${isDone ? '<span class="text-green">✔ Misi Selesai</span>' :
                  `<button class="btn btn-gold" onclick="claimStoryContract('${c.id}')">Klaim Misi</button>`}
            `;
        }
        grid.appendChild(card);
    });
}

window.claimStoryContract = function(cId) {
    const c = STORY_CONTRACTS_MASTER.find(x => x.id === cId);
    if (!c) return;

    let canClaim = true;
    const totalCities = Object.keys(gameState.controlledCities || {}).length;
    const myPwr = getPlayerTotalPower();
    const totalOfficers = Object.keys(gameState.officers || {}).length;

    let totalBiz = 0;
    Object.values(gameState.businesses || {}).forEach(v => totalBiz += v);

    let totalGarrisonMembers = 0;
    Object.values(gameState.cityGarrisons || {}).forEach(gar => {
        if (gar && gar.members) totalGarrisonMembers += gar.members.length;
    });

    let totalPilkadaContrib = 0;
    if (globalPilkada && globalPilkada.paslon) {
        globalPilkada.paslon.forEach(p => {
            if (p.usersContrib && p.usersContrib[currentUser.uid]) {
                totalPilkadaContrib += p.usersContrib[currentUser.uid];
            }
        });
    }

    if (c.reqCities && totalCities < c.reqCities) canClaim = false;
    if (c.reqWeapons && (gameState.weapons || 0) < c.reqWeapons) canClaim = false;
    if (c.reqMembers && (gameState.members || []).length < c.reqMembers) canClaim = false;
    if (c.reqPwr && myPwr < c.reqPwr) canClaim = false;
    if (c.reqOfficersCount && totalOfficers < c.reqOfficersCount) canClaim = false;
    if (c.reqBizCount && totalBiz < c.reqBizCount) canClaim = false;
    if (c.reqGarrisonMembers && totalGarrisonMembers < c.reqGarrisonMembers) canClaim = false;
    if (c.reqGlobalCount && Object.keys(gameState.controlledGlobal || {}).length < c.reqGlobalCount) canClaim = false;
    if (c.reqPilkadaContrib && totalPilkadaContrib < c.reqPilkadaContrib) canClaim = false;

    if (canClaim) {
        audioFX.playSuccess();
        if (!gameState.completedContracts) gameState.completedContracts = {};
        gameState.completedContracts[cId] = true;
        gameState.money += c.rewardCash;
        gameState.reputation = (gameState.reputation || 0) + c.rewardRep;

        alert(`MISI CAMPAIGN SUKSES: Anda meraih Rp ${c.rewardCash.toLocaleString('id-ID')} & +${c.rewardRep} REP!`);
        logMessage(`Misi '${c.title}' berhasil diklaim.`, 'success');
        renderContractsUI();
        updateUI();
    } else alert("Syarat target misi campaign belum terpenuhi sepenuhnya!");
};

// PETA WILAYAH & MODAL INPUT PASUKAN (2 MENIT & POWER REAL-TIME)
async function populateProvinceViewSelect() {
    globalOccupiedMap = await fetchGlobalOccupiedCities();
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
    const prov = PROVINCES.find(p => p.id === selProvId);
    if (!grid || !prov) return;

    grid.innerHTML = '';
    const warBusy = isWarInProgress();

    prov.cities.forEach(cityName => {
        const isControlledByMe = gameState.controlledCities[cityName];
        const occupant = globalOccupiedMap[cityName];
        const isBeingAttackedByAi = (gameState.activeAiAttacks || []).some(atk => atk.cityName === cityName);

        let cardClass = 'controlled-enemy'; 
        let statusText = 'Dikuasai AI Rival';
        let cityPowerLabel = '120 PWR (AI)';

        if (isControlledByMe) {
            cardClass = 'controlled-player'; 
            statusText = 'Wilayah Anda';
            cityPowerLabel = `${getCityGarrisonPower(cityName)} PWR (Garnisun)`;
        } else if (occupant) {
            cardClass = 'controlled-otherplayer'; 
            statusText = `Dikuasai Pemain: ${occupant.username}`;
            cityPowerLabel = `150+ PWR`;
        } else if (isBeingAttackedByAi) {
            statusText = 'Pasukan Dalam Perjalanan (2 Mnt)...';
        }

        const card = document.createElement('div');
        card.className = `turf-card ${cardClass}`;
        card.innerHTML = `
            <h4>${cityName}</h4>
            <p style="font-size:0.85rem;">Status: <strong>${statusText}</strong></p>
            <p style="font-size:0.8rem; color:var(--text-muted);">Kekuatan: <strong class="text-yellow">${cityPowerLabel}</strong></p>
            ${isControlledByMe ? '<span class="text-green">✔ Wilayah Aman</span>' :
              occupant ? `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" ${warBusy ? 'disabled' : ''} onclick="openAttackDeployModal('${cityName}', 'pvp')">${warBusy ? 'Sedang Perang...' : 'Serang Pemain (2 Mnt)'}</button>` :
              isBeingAttackedByAi ? `<button class="btn btn-gold btn-xs" style="margin-top:10px; width:100%;" disabled>Menyerang (2 Mnt)...</button>` :
              `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" ${warBusy ? 'disabled' : ''} onclick="openAttackDeployModal('${cityName}', 'ai')">${warBusy ? 'Sedang Perang...' : 'Invasi AI (2 Mnt)'}</button>`}
        `;
        grid.appendChild(card);
    });
}

window.openAttackDeployModal = function(cityName, attackType = 'ai') {
    if (isWarInProgress()) {
        alert("Selesaikan operasi perang berjalan terlebih dahulu!");
        return;
    }

    pendingAttackCityTarget = cityName;
    pendingAttackType = attackType;

    document.getElementById('attack-deploy-target-label').innerText = `Target: ${cityName} (${attackType.toUpperCase()})`;
    document.getElementById('deploy-avail-members').innerText = (gameState.members || []).length;
    document.getElementById('deploy-avail-weapons').innerText = gameState.weapons || 0;

    calculateDeployPowerEstimate();
    document.getElementById('attack-deploy-modal').classList.remove('hidden');
};

window.calculateDeployPowerEstimate = function() {
    const reqMembersCount = parseInt(document.getElementById('deploy-member-count').value) || 0;
    const reqWeaponsCount = parseInt(document.getElementById('deploy-weapon-count').value) || 0;

    let pwrEst = reqWeaponsCount * 25;
    const availMems = gameState.members || [];
    for (let i = 0; i < Math.min(reqMembersCount, availMems.length); i++) {
        pwrEst += (availMems[availMems.length - 1 - i].power || 0);
    }

    document.getElementById('deploy-est-power').innerText = `${pwrEst} PWR`;
};

window.closeAttackDeployModal = function() {
    document.getElementById('attack-deploy-modal').classList.add('hidden');
    pendingAttackCityTarget = null;
};

window.confirmAttackDeployment = async function() {
    if (!pendingAttackCityTarget) return;

    const reqMembersCount = parseInt(document.getElementById('deploy-member-count').value) || 0;
    const reqWeaponsCount = parseInt(document.getElementById('deploy-weapon-count').value) || 0;

    if (reqMembersCount <= 0) {
        alert("Wajib mengirim minimal 1 pasukan untuk operasi!");
        return;
    }

    if ((gameState.members || []).length < reqMembersCount || (gameState.weapons || 0) < reqWeaponsCount) {
        alert("Jumlah Pasukan atau Senjata di Markas tidak cukup!");
        return;
    }

    let deployedMembers = [];
    let deployedPwr = reqWeaponsCount * 25;

    for (let i = 0; i < reqMembersCount; i++) {
        const m = gameState.members.pop();
        deployedMembers.push(m);
        deployedPwr += (m.power || 0);
    }
    gameState.weapons -= reqWeaponsCount;

    audioFX.playWarDrum();
    const endTime = Date.now() + (2 * 60 * 1000); 

    if (pendingAttackType === 'ai') {
        gameState.activeAiAttacks = [{
            attackId: Date.now(),
            cityName: pendingAttackCityTarget,
            endTime: endTime,
            deployedMembers: deployedMembers,
            deployedWeapons: reqWeaponsCount,
            pwr: deployedPwr
        }];
    } else {
        const occupant = globalOccupiedMap[pendingAttackCityTarget];
        gameState.activePvPWars = [{
            warId: Date.now(),
            cityName: pendingAttackCityTarget,
            targetUid: occupant ? occupant.uid : '',
            targetUsername: occupant ? occupant.username : 'Pemain',
            endTime: endTime,
            deployedMembers: deployedMembers,
            deployedWeapons: reqWeaponsCount,
            attackerPwr: deployedPwr
        }];
    }

    logMessage(`OPERASI PERANG 2 MENIT DILUNCURKAN ke ${pendingAttackCityTarget}! ${reqMembersCount} Pasukan & ${reqWeaponsCount} Senjata berlayar.`, 'danger');
    closeAttackDeployModal();
    await cloudAutosaveInterval();
    updateUI();
};

function aiAttacksTicker() {
    if (!gameState.activeAiAttacks || gameState.activeAiAttacks.length === 0) {
        renderActiveAiAttacks();
        return;
    }

    const now = Date.now();
    gameState.activeAiAttacks.forEach(async (atk) => {
        if (now >= atk.endTime) {
            if (atk.pwr >= 100 && Math.random() < 0.70) {
                audioFX.playSuccess();
                gameState.controlledCities[atk.cityName] = true;
                await updateCityOccupantGlobal(atk.cityName, currentUser.uid, gameState.username);

                (atk.deployedMembers || []).forEach(m => gameState.members.push(m));
                gameState.weapons = (gameState.weapons || 0) + (atk.deployedWeapons || 0);

                setAssistantMessage(`Sukses! Kota ${atk.cityName} berhasil direbut dari AI!`);
                logMessage(`INVASII SUKSES: Kota ${atk.cityName} ditaklukkan! Pasukan kembali ke markas.`, 'success');
            } else {
                audioFX.playDanger();
                setAssistantMessage(`Gagal menginvasi ${atk.cityName}. Pasukan gugur di pertempuran.`);
                logMessage(`INVASII GAGAL: Serangan ke ${atk.cityName} dipukul mundur AI. Pasukan gugur.`, 'danger');
            }

            gameState.activeAiAttacks = [];
            await cloudAutosaveInterval();
            updateUI();
        }
    });

    renderActiveAiAttacks();
}

function renderActiveAiAttacks() {
    const grid = document.getElementById('active-ai-attacks-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!gameState.activeAiAttacks || gameState.activeAiAttacks.length === 0) {
        grid.innerHTML = '<p class="text-muted">Tidak ada armada perang berjalan.</p>';
        return;
    }

    const now = Date.now();
    gameState.activeAiAttacks.forEach(atk => {
        const sisaSec = Math.max(0, Math.ceil((atk.endTime - now) / 1000));
        const min = Math.floor(sisaSec / 60);
        const sec = sisaSec % 60;

        const card = document.createElement('div');
        card.className = 'game-card controlled-enemy';
        card.innerHTML = `
            <div>
                <h4>Perang Invasi AI: ${atk.cityName}</h4>
                <p>Pasukan Dikirim: <strong>${(atk.deployedMembers||[]).length} Orang, ${atk.deployedWeapons||0} Senjata</strong></p>
                <p>Power Invasi: <strong>${atk.pwr} PWR</strong></p>
                <p>Sisa Waktu Pertempuran: <strong class="text-yellow">${min}:${sec < 10 ? '0' : ''}${sec}</strong></p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function pvpWarsTicker() {
    if (!gameState.activePvPWars || gameState.activePvPWars.length === 0) {
        renderActivePvPWars();
        return;
    }

    const now = Date.now();
    gameState.activePvPWars.forEach(async (war) => {
        if (now >= war.endTime) {
            const targetCloudData = await loadUserDataFromCloud(war.targetUid);
            let targetPwr = 200;
            if (targetCloudData) {
                targetPwr = (targetCloudData.weapons || 0) * 25;
                (targetCloudData.members || []).forEach(m => targetPwr += (m.power || 0));
                if (targetCloudData.defendingMercenaries) targetPwr += 100;
            }

            if (war.attackerPwr > targetPwr) {
                audioFX.playSuccess();
                gameState.controlledCities[war.cityName] = true;
                let lootedCash = 15000000;
                if (targetCloudData && targetCloudData.money) {
                    lootedCash = Math.min(50000000, Math.floor(targetCloudData.money * 0.10));
                }
                gameState.money += lootedCash;

                (war.deployedMembers || []).forEach(m => gameState.members.push(m));
                gameState.weapons = (gameState.weapons || 0) + (war.deployedWeapons || 0);

                await updateCityOccupantGlobal(war.cityName, currentUser.uid, gameState.username);

                if (targetCloudData) {
                    if (targetCloudData.controlledCities) delete targetCloudData.controlledCities[war.cityName];
                    targetCloudData.money = Math.max(0, targetCloudData.money - lootedCash);
                    targetCloudData.peaceShieldUntil = Date.now() + (12 * 60 * 60 * 1000);
                    delete targetCloudData.defendingMercenaries;
                    await saveUserDataToCloud(war.targetUid, targetCloudData);
                }

                logMessage(`PERANG PVP SELESAI: Berhasil merebut ${war.cityName} dari ${war.targetUsername} & menjarah Rp ${lootedCash.toLocaleString('id-ID')}! Pasukan kembali.`, 'success');
            } else {
                audioFX.playDanger();
                logMessage(`PERANG PVP SELESAI: Serangan ke ${war.cityName} dipukul mundur oleh pertahanan ${war.targetUsername}. Pasukan gugur.`, 'danger');
            }

            gameState.activePvPWars = [];
            await cloudAutosaveInterval();
            updateUI();
        }
    });

    renderActivePvPWars();
    checkIncomingPvPDefenseModal();
}

function renderActivePvPWars() {
    const grid = document.getElementById('active-wars-grid');
    if (!grid) return;

    if (!gameState.activePvPWars || gameState.activePvPWars.length === 0) return;

    const now = Date.now();
    gameState.activePvPWars.forEach(w => {
        const sisaSec = Math.max(0, Math.ceil((w.endTime - now) / 1000));
        const min = Math.floor(sisaSec / 60);
        const sec = sisaSec % 60;

        const card = document.createElement('div');
        card.className = 'game-card controlled-enemy';
        card.innerHTML = `
            <div>
                <h4>Serangan PvP: ${w.cityName}</h4>
                <p>Target: <strong>${w.targetUsername}</strong></p>
                <p>Pasukan Dikirim: <strong>${(w.deployedMembers||[]).length} Orang, ${w.deployedWeapons||0} Senjata (${w.attackerPwr} PWR)</strong></p>
                <p>Sisa Waktu Pasukan Tiba: <strong class="text-yellow">${min}:${sec < 10 ? '0' : ''}${sec}</strong></p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function checkIncomingPvPDefenseModal() {
    const modal = document.getElementById('pvp-defense-modal');
    if (!gameState.incomingPvPAttack || gameState.incomingPvPAttack.length === 0) {
        if (modal) modal.classList.add('hidden');
        return;
    }

    const now = Date.now();
    gameState.incomingPvPAttack = gameState.incomingPvPAttack.filter(atk => now < atk.endTime);

    if (gameState.incomingPvPAttack.length === 0) {
        if (modal) modal.classList.add('hidden');
        return;
    }

    const atk = gameState.incomingPvPAttack[0];
    const sisaSec = Math.max(0, Math.ceil((atk.endTime - now) / 1000));
    const min = Math.floor(sisaSec / 60);
    const sec = sisaSec % 60;

    document.getElementById('pvp-defense-desc').innerText = `Kota ${atk.cityName} milik Anda sedang diserang oleh ${atk.attackerUsername}!`;
    document.getElementById('pvp-defense-timer').innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;

    if (modal && modal.classList.contains('hidden')) {
        audioFX.playSiren();
        modal.classList.remove('hidden');
    }
}

window.hireMercenariesForDefense = async function() {
    if (gameState.money >= 15000000) {
        audioFX.playSuccess();
        gameState.money -= 15000000;
        gameState.defendingMercenaries = true;
        alert("Berhasil menyewa pasukan bayaran! Pertahanan kota meningkat +100 PWR.");
        logMessage("Sewa Pasukan Bayaran Rp 15 Juta untuk pertahanan kota.", 'success');
        document.getElementById('pvp-defense-modal').classList.add('hidden');
        await cloudAutosaveInterval();
        updateUI();
    } else alert("Uang kas tidak cukup (Butuh Rp 15 Juta)!");
};

window.ignoreDefense = function() {
    document.getElementById('pvp-defense-modal').classList.add('hidden');
};

// BEKING POLITIK & PILKADA
function renderPilkadaUI() {
    const phaseLabel = document.getElementById('politics-phase-label');
    const govBadge = document.getElementById('active-governor-badge');
    const grid = document.getElementById('paslon-list-grid');

    if (!phaseLabel || !grid) return;

    phaseLabel.innerText = globalPilkada.phase;
    if (globalPilkada.winnerId) {
        const winnerObj = globalPilkada.paslon.find(x => x.id === globalPilkada.winnerId);
        if (govBadge) govBadge.innerText = winnerObj ? winnerObj.name : 'Belum Ada';
    } else {
        if (govBadge) govBadge.innerText = 'Masa Kampanye / Kosong';
    }

    grid.innerHTML = '';
    let totalAllModal = 0;
    globalPilkada.paslon.forEach(p => totalAllModal += p.totalFund);

    globalPilkada.paslon.forEach(p => {
        let electPct = totalAllModal > 0 ? ((p.totalFund / totalAllModal) * 100).toFixed(1) : (100 / globalPilkada.paslon.length).toFixed(1);
        const myContrib = (p.usersContrib && p.usersContrib[currentUser.uid]) ? p.usersContrib[currentUser.uid] : 0;
        const paslonImg = PASLON_IMAGES[p.id] || PASLON_IMAGES[1];

        const card = document.createElement('div');
        card.className = `game-card ${globalPilkada.winnerId === p.id ? 'controlled-player' : ''}`;
        card.innerHTML = `
            <div>
                <img src="${paslonImg}" class="card-img-banner" alt="${p.name}">
                <h4>${p.name}</h4>
                <p>Visi & Buff: <strong class="text-yellow">${p.desc}</strong></p>
                <p>Elektabilitas Peluang: <strong class="text-green">${electPct}%</strong></p>
                <p>Modal Terkumpul: Rp ${p.totalFund.toLocaleString('id-ID')}</p>
                <p>Suntikan Anda: <span class="text-blue">Rp ${myContrib.toLocaleString('id-ID')}</span></p>
            </div>
            ${globalPilkada.phase === 'KAMPANYE' ? `
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button class="btn btn-gold btn-xs" style="flex:1;" onclick="injectPoliticalFund(${p.id}, 5000000)">Suntik Rp 5Jt</button>
                    <button class="btn btn-red btn-xs" style="flex:1;" onclick="seranganFajar(${p.id})">Serangan Fajar (Rp 12.5Jt)</button>
                </div>
            ` : '<span class="text-muted">Pencoblosan Diperhitungkan...</span>'}
        `;
        grid.appendChild(card);
    });
}

function pilkadaTicker() {
    const now = Date.now();
    const sisaSec = Math.max(0, Math.ceil((globalPilkada.phaseEndTime - now) / 1000));
    
    const hrs = Math.floor(sisaSec / 3600);
    const mins = Math.floor((sisaSec % 3600) / 60);
    const secs = sisaSec % 60;

    const timerLabel = document.getElementById('politics-timer-count');
    if (timerLabel) {
        timerLabel.innerText = `${hrs < 10 ? '0' : ''}${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    if (now >= globalPilkada.phaseEndTime) {
        if (globalPilkada.phase === 'KAMPANYE') {
            globalPilkada.phase = 'QUICK_COUNT';
            globalPilkada.phaseEndTime = now + (2 * 60 * 60 * 1000);
            executePilkadaWinnerSelection();
        } else if (globalPilkada.phase === 'QUICK_COUNT') {
            globalPilkada.phase = 'MASA_JABATAN';
            globalPilkada.phaseEndTime = now + (3 * 24 * 60 * 60 * 1000);
        } else if (globalPilkada.phase === 'MASA_JABATAN') {
            globalPilkada.phase = 'KAMPANYE';
            globalPilkada.phaseEndTime = now + (10 * 60 * 60 * 1000);
            globalPilkada.winnerId = null;
            globalPilkada.paslon.forEach(p => { p.totalFund = 0; p.usersContrib = {}; });
        }
        saveGlobalPilkadaData(globalPilkada);
        renderPilkadaUI();
    }
}

function executePilkadaWinnerSelection() {
    let totalFund = 0;
    globalPilkada.paslon.forEach(p => totalFund += p.totalFund);

    let randVal = Math.random() * (totalFund > 0 ? totalFund : 3);
    let cumulative = 0;
    let winner = globalPilkada.paslon[0];

    if (totalFund === 0) {
        winner = globalPilkada.paslon[Math.floor(Math.random() * globalPilkada.paslon.length)];
    } else {
        for (let p of globalPilkada.paslon) {
            cumulative += p.totalFund;
            if (randVal <= cumulative) {
                winner = p;
                break;
            }
        }
    }

    audioFX.playSuccess();
    globalPilkada.winnerId = winner.id;
    logMessage(`PILKADA SELESAI: ${winner.name} resmi terpilih menjadi Gubernur!`, 'success');
}

window.injectPoliticalFund = function(paslonId, amount) {
    if (globalPilkada.phase !== 'KAMPANYE') {
        alert("Pilkada tidak dalam masa kampanye!");
        return;
    }
    if (gameState.money >= amount) {
        audioFX.playSuccess();
        gameState.money -= amount;
        const p = globalPilkada.paslon.find(x => x.id === paslonId);
        if (p) {
            p.totalFund += amount;
            if (!p.usersContrib) p.usersContrib = {};
            p.usersContrib[currentUser.uid] = (p.usersContrib[currentUser.uid] || 0) + amount;
        }
        saveGlobalPilkadaData(globalPilkada);
        logMessage(`Suntikan modal politik Rp ${amount.toLocaleString('id-ID')} sukses.`, 'success');
        renderPilkadaUI();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.seranganFajar = function(paslonId) {
    if (gameState.money >= 12500000) {
        audioFX.playWarDrum();
        gameState.money -= 12500000;
        const p = globalPilkada.paslon.find(x => x.id === paslonId);
        if (p) {
            p.totalFund += 20000000;
            if (!p.usersContrib) p.usersContrib = {};
            p.usersContrib[currentUser.uid] = (p.usersContrib[currentUser.uid] || 0) + 12500000;
        }
        saveGlobalPilkadaData(globalPilkada);
        logMessage("Serangan Fajar dieksekusi! (Rp 12.5 Juta).", 'danger');
        renderPilkadaUI();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

// AKSI KRIMINAL
function renderCrimes() {
    const container = document.getElementById('crimes-list');
    if (!container) return;
    container.innerHTML = '';

    const hasActive = gameState.activeCrime !== null;

    CRIMES_DATA.forEach(c => {
        let isLocked = false;
        let lockReason = '';
        if (c.type === 'spesial' && !gameState.officers[c.reqOfficer]) {
            isLocked = true;
            lockReason = `Butuh Perwira Unik Terkait`;
        }

        const crimeImg = c.img || 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=500&q=80';

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <img src="${crimeImg}" class="card-img-banner" alt="${c.name}">
                <h4>${c.name} <span class="text-yellow" style="font-size:0.75rem;">[${c.type.toUpperCase()}]</span></h4>
                <p>Durasi: ${c.durationSec}s | Syarat: Min ${c.minMembers} Pasukan, ${c.minPower} PWR</p>
                <p>Hasil: Rp ${c.minReward.toLocaleString('id-ID')} - Rp ${c.maxReward.toLocaleString('id-ID')} | Heat +${c.heat}%</p>
                ${isLocked ? `<small class="text-red">Terkunci: ${lockReason}</small>` : ''}
            </div>
            <button class="btn btn-gold" ${hasActive || isLocked ? 'disabled' : ''} onclick="startCrime('${c.id}')">
                ${hasActive ? 'Sedang Berjalan' : 'Eksekusi Aksi'}
            </button>
        `;
        container.appendChild(card);
    });
}

window.startCrime = function(crimeId) {
    if (gameState.isJailed) { alert("Anda di dalam penjara!"); return; }
    if (gameState.activeCrime) { alert("Selesaikan aksi sebelumnya!"); return; }

    const c = CRIMES_DATA.find(x => x.id === crimeId);
    if (!c) return;

    if ((gameState.members || []).length < c.minMembers || getPlayerTotalPower() < c.minPower) {
        alert(`Syarat tidak cukup! Butuh min ${c.minMembers} pasukan dan ${c.minPower} PWR.`);
        return;
    }

    const endTime = Date.now() + (c.durationSec * 1000);
    gameState.activeCrime = { crimeId: c.id, endTime };
    logMessage(`Memulai aksi '${c.name}'...`, 'success');
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
    
    document.getElementById('active-crime-name-label').innerText = `Jenis: ${c ? c.name : '-'}`;
    document.getElementById('active-crime-timer').innerText = sisaSec;

    if (now >= ac.endTime) {
        if (c) {
            let heatInc = c.heat;
            if (gameState.officers['akbp_hendro']) heatInc *= 0.7;

            if (Math.random() < 0.75) {
                audioFX.playSuccess();
                const earned = Math.floor(Math.random() * (c.maxReward - c.minReward + 1)) + c.minReward;
                gameState.money += earned;
                gameState.heat = Math.min(100, (gameState.heat || 0) + heatInc);
                setAssistantMessage(`Aksi '${c.name}' sukses! Mendapatkan Rp ${earned.toLocaleString('id-ID')}.`);
                logMessage(`Aksi '${c.name}' sukses! (+Rp ${earned.toLocaleString('id-ID')})`, 'success');

                if (gameState.heat >= 100) triggerPlayerJail();
            } else {
                audioFX.playDanger();
                gameState.heat = Math.min(100, (gameState.heat || 0) + (heatInc * 2));
                if (Math.random() < 0.5 && gameState.members.length > 0) {
                    const jailedMem = gameState.members.pop();
                    gameState.jailedMembers.push({ ...jailedMem, timerSec: 60 });
                    setAssistantMessage(`Aksi digerebek! 1 anak buah ditangkap.`);
                    logMessage(`Gagal! 1 Anak buah ditangkap polisi.`, 'danger');
                } else {
                    const loss = Math.floor(gameState.money * 0.15);
                    gameState.money -= loss;
                    setAssistantMessage(`Aksi gagal! Rugi Rp ${loss.toLocaleString('id-ID')}.`);
                    logMessage(`Gagal! Rugi Rp ${loss.toLocaleString('id-ID')}.`, 'danger');
                }
            }
        }
        gameState.activeCrime = null;
        renderCrimes();
        updateUI();
    }
}

// BISNIS HARAM
function renderBusiness() {
    const container = document.getElementById('business-list');
    if (!container) return;
    container.innerHTML = '';

    BUSINESS_DATA.forEach(b => {
        const count = gameState.businesses[b.id] || 0;
        const bizImg = b.img || BUSINESS_IMAGES[b.id] || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80';

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <img src="${bizImg}" class="card-img-banner" alt="${b.name}">
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
        audioFX.playSuccess();
        gameState.money -= b.cost;
        gameState.businesses[bId] = (gameState.businesses[bId] || 0) + 1;
        logMessage(`Membeli bisnis '${b.name}'.`, 'success');
        renderBusiness();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.buyMember = function() {
    const cost = 1500000;
    if (gameState.money >= cost) {
        audioFX.playSuccess();
        gameState.money -= cost;
        const pwr = Math.floor(Math.random() * 5) + 1;
        if (!gameState.members) gameState.members = [];
        gameState.members.push({ id: Date.now(), power: pwr });
        setAssistantMessage(`1 Pasukan baru direkrut (+${pwr} PWR).`);
        logMessage(`Merekrut pasukan baru (+${pwr} PWR).`, 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.buyWeapon = function() {
    const cost = 6000000;
    if (gameState.money >= cost) {
        audioFX.playSuccess();
        gameState.money -= cost;
        gameState.weapons = (gameState.weapons || 0) + 1;
        logMessage("Membeli 1 Senjata Baru (+25 PWR).", 'success');
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

function renderMembersList() {
    const grid = document.getElementById('members-list-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!gameState.members || gameState.members.length === 0) {
        grid.innerHTML = '<p class="text-muted">Tidak ada pasukan di markas utama.</p>';
        return;
    }

    gameState.members.forEach((m, idx) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>Pasukan Markas #${idx + 1}</h4>
                <p>Kekuatan: <strong>${m.power} PWR</strong> | Upah: Rp 50.000 / mnt</p>
            </div>
            <button class="btn btn-red btn-xs" onclick="fireMember(${m.id})">Pecat</button>
        `;
        grid.appendChild(card);
    });
}

window.fireMember = function(memberId) {
    gameState.members = gameState.members.filter(m => m.id !== memberId);
    logMessage("Pasukan dipecat.", "danger");
    updateUI();
};

function removeRandomMembers(min, max) {
    if (!gameState.members || gameState.members.length === 0) return;
    const count = Math.min(gameState.members.length, Math.floor(Math.random() * (max - min + 1)) + min);
    for (let i = 0; i < count; i++) gameState.members.pop();
}

// PERWIRA UNIK
function renderOfficers() {
    const container = document.getElementById('officers-list');
    if (!container) return;
    container.innerHTML = '';

    OFFICERS_MASTER.forEach(o => {
        const isHired = gameState.officers[o.id];
        const officerImg = o.img || OFFICER_IMAGES[o.id] || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&q=80';

        const card = document.createElement('div');
        card.className = `game-card ${isHired ? 'controlled-player' : ''}`;
        card.innerHTML = `
            <div>
                <img src="${officerImg}" class="card-img-banner" alt="${o.name}">
                <h4>${o.name} (${o.title})</h4>
                <p>${o.desc}</p>
                <p>Biaya: Rp ${o.cost.toLocaleString('id-ID')}</p>
            </div>
            ${isHired ? '<span class="text-green">✔ Aktif</span>' :
              `<button class="btn btn-gold" onclick="hireOfficer('${o.id}')">Rekrut</button>`}
        `;
        container.appendChild(card);
    });
}

window.hireOfficer = function(oId) {
    const o = OFFICERS_MASTER.find(x => x.id === oId);
    if (!o) return;
    if (gameState.money >= o.cost) {
        audioFX.playSuccess();
        gameState.money -= o.cost;
        gameState.officers[oId] = true;
        setAssistantMessage(`Perwira '${o.name}' bergabung.`);
        logMessage(`Merekrut Perwira: ${o.name}`, 'success');
        renderOfficers();
        renderCrimes();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

// MINI GAME SEKERING SEL PENJARA
function triggerPlayerJail() {
    audioFX.playSiren();
    gameState.isJailed = true;
    gameState.jailTimesCount = (gameState.jailTimesCount || 0) + 1;
    gameState.jailTimerSec = getNextJailDurationSec();

    document.getElementById('jail-modal').classList.remove('hidden');
    setAssistantMessage(`Ditangkap Polda! Waktu tahanan: ${Math.floor(gameState.jailTimerSec/60)} menit.`);
    logMessage(`Ditangkap Polda! Tahanan ke-${gameState.jailTimesCount}.`, 'danger');
    initJailMiniGame();
}

function initJailMiniGame() {
    const grid = document.getElementById('jail-minigame-grid');
    const status = document.getElementById('jail-minigame-status');
    const seqDisplay = document.getElementById('jail-minigame-sequence-display');
    if (!grid) return;

    grid.innerHTML = '';
    status.innerText = "Tekan tombol saklar sesuai urutan kode!";

    jailMiniGamePattern = [
        Math.floor(Math.random() * 3) + 1,
        Math.floor(Math.random() * 3) + 1,
        Math.floor(Math.random() * 3) + 1
    ];
    jailMiniGameUserIdx = 0;

    if (seqDisplay) {
        seqDisplay.innerText = `KODE: [ ${jailMiniGamePattern.join(' - ')} ]`;
    }

    for (let i = 1; i <= 3; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-gold';
        btn.style.flex = '1';
        btn.innerText = `⚡ Saklar ${i}`;
        btn.onclick = () => handleJailMiniGameClick(i);
        grid.appendChild(btn);
    }
}

function handleJailMiniGameClick(num) {
    const status = document.getElementById('jail-minigame-status');
    if (num === jailMiniGamePattern[jailMiniGameUserIdx]) {
        jailMiniGameUserIdx++;
        if (jailMiniGameUserIdx >= jailMiniGamePattern.length) {
            audioFX.playSuccess();
            gameState.jailTimerSec = Math.max(0, gameState.jailTimerSec - 30);
            status.className = "text-green";
            status.innerText = "RETAS SUKSES! Masa Tahanan Dipotong 30 Detik!";
            initJailMiniGame();
        } else {
            status.className = "text-yellow";
            status.innerText = `Saklar ${num} Tepat! Tekan saklar berikutnya...`;
        }
    } else {
        audioFX.playDanger();
        status.className = "text-red";
        status.innerText = "KONSLET! Urutan salah, mengulang kode baru...";
        jailMiniGameUserIdx = 0;
        setTimeout(initJailMiniGame, 1000);
    }
}

function jailTicker() {
    if (gameState.isJailed) {
        gameState.jailTimerSec--;
        document.getElementById('jail-timer-count').innerText = gameState.jailTimerSec;
        if (gameState.jailTimerSec <= 0) {
            audioFX.playSuccess();
            gameState.isJailed = false;
            gameState.heat = 20;
            document.getElementById('jail-modal').classList.add('hidden');
            setAssistantMessage("Bebas dari tahanan.");
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
            logMessage(`${freed.length} Anak buah selesai masa tahanan dan kembali!`, 'success');
            updateUI();
        }
    }
}

window.jailBribe100 = function() {
    let cost = 25000000;
    if (globalPilkada.winnerId === 2) cost *= 0.5;

    if (gameState.money >= cost) {
        audioFX.playSuccess();
        gameState.money -= cost;
        gameState.isJailed = false;
        gameState.heat = 0;
        document.getElementById('jail-modal').classList.add('hidden');
        logMessage(`Suap bebas instan (Rp ${cost.toLocaleString('id-ID')}).`, 'success');
        updateUI();
    } else alert(`Uang tidak cukup (Butuh Rp ${cost.toLocaleString('id-ID')})!`);
};

window.jailLawyer = function() {
    if (gameState.money >= 8000000) {
        gameState.money -= 8000000;
        if (Math.random() < 0.5) {
            audioFX.playSuccess();
            gameState.isJailed = false;
            gameState.heat = 20;
            document.getElementById('jail-modal').classList.add('hidden');
            logMessage("Pengacara memenangkan gugatan.", 'success');
        } else {
            audioFX.playDanger();
            gameState.jailTimerSec = Math.max(5, gameState.jailTimerSec - 30);
            alert("Hukuman dipotong 30 detik.");
        }
        updateUI();
    } else alert("Uang tidak cukup (Butuh Rp 8 Juta)!");
};

window.jailBreakout = function() {
    if (gameState.money >= 3000000) {
        gameState.money -= 3000000;
        if (Math.random() < 0.3) {
            audioFX.playSuccess();
            gameState.isJailed = false;
            gameState.heat = 50;
            document.getElementById('jail-modal').classList.add('hidden');
            logMessage("Serbuan penjara berhasil!", 'success');
        } else {
            audioFX.playDanger();
            alert("Gagal! Waktu bertambah 30 detik.");
            gameState.jailTimerSec += 30;
            removeRandomMembers(1, 2);
        }
        updateUI();
    } else alert("Uang tidak cukup (Butuh Rp 3 Juta)!");
};

function renderJailedMembersList() {
    const container = document.getElementById('jailed-members-container');
    if (!container) return;

    if (!gameState.jailedMembers || gameState.jailedMembers.length === 0) {
        container.innerHTML = '<span class="text-green">Aman (0 Orang)</span>';
        return;
    }

    container.innerHTML = '';
    gameState.jailedMembers.forEach(m => {
        const div = document.createElement('div');
        div.style.fontSize = '0.8rem';
        div.style.marginTop = '2px';
        div.innerHTML = `PWR ${m.power} (${m.timerSec}s) <button class="btn-xs btn-gold" onclick="bribeFreeJailedMember(${m.id})">Suap (Rp 5Jt)</button>`;
        container.appendChild(div);
    });
}

window.bribeFreeJailedMember = function(mId) {
    const targetMember = gameState.jailedMembers.find(x => x.id === mId);
    if (!targetMember) {
        alert("Anak buah sudah bebas!");
        renderJailedMembersList();
        return;
    }

    if (gameState.money >= 5000000) {
        audioFX.playSuccess();
        gameState.money -= 5000000;
        gameState.members.push({ id: targetMember.id, power: targetMember.power });
        gameState.jailedMembers = gameState.jailedMembers.filter(x => x.id !== mId);
        logMessage("Anak buah berhasil dibebaskan dari sel melalui suap.", 'success');
        updateUI();
    } else alert("Uang tidak cukup untuk menyuap (Butuh Rp 5 Juta)!");
};

// EKSPEDISI PENYELUNDUPAN
function rotateExpeditionMissions() {
    const todayStr = new Date().toDateString();
    if (gameState.lastExpeditionDate !== todayStr) {
        gameState.expeditionCountToday = 0;
        gameState.lastExpeditionDate = todayStr;
    }

    const now = Date.now();
    gameState.availableExpeditions = (gameState.availableExpeditions || []).filter(ae => now < ae.expireTime);

    if (gameState.availableExpeditions.length < 2) {
        const pickCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < pickCount; i++) {
            const randExp = ALL_EXPEDITION_MASTER[Math.floor(Math.random() * ALL_EXPEDITION_MASTER.length)];
            const expireTime = now + (Math.floor(Math.random() * 20) + 20) * 1000;
            if (!gameState.availableExpeditions.some(ae => ae.expId === randExp.id)) {
                gameState.availableExpeditions.push({ id: Date.now() + Math.random(), expId: randExp.id, expireTime });
            }
        }
    }
    renderExpeditions();
}

function renderExpeditions() {
    const container = document.getElementById('expeditions-list');
    const limitInfo = document.getElementById('expedition-limit-info');
    if (!container) return;
    container.innerHTML = '';

    const todayStr = new Date().toDateString();
    if (gameState.lastExpeditionDate !== todayStr) {
        gameState.expeditionCountToday = 0;
        gameState.lastExpeditionDate = todayStr;
    }

    const remaining = Math.max(0, 2 - gameState.expeditionCountToday);
    if (limitInfo) limitInfo.innerText = `Sisa Kuota Ekspedisi Hari Ini: ${remaining} / 2 kali (Reset 00:00 WIB)`;

    const hasActive = gameState.activeExpedition !== null;
    const limitReached = gameState.expeditionCountToday >= 2;
    const now = Date.now();

    if (!gameState.availableExpeditions || gameState.availableExpeditions.length === 0) {
        container.innerHTML = '<p class="text-muted">Menunggu tawaran penyelundupan baru...</p>';
        return;
    }

    gameState.availableExpeditions.forEach(ae => {
        const expType = ALL_EXPEDITION_MASTER.find(x => x.id === ae.expId);
        if (!expType) return;

        const sisaAmbilSec = Math.max(0, Math.ceil((ae.expireTime - now) / 1000));

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${expType.name}</h4>
                <p>Durasi: ${expType.durationSec}s | Hasil: Rp ${expType.reward.toLocaleString('id-ID')}</p>
                <p>Batas Waktu Ambil: <strong class="text-yellow">${sisaAmbilSec}s</strong></p>
            </div>
            <button class="btn btn-gold" ${hasActive || limitReached || sisaAmbilSec <= 0 ? 'disabled' : ''} onclick="startExpedition('${ae.id}')">
                ${limitReached ? 'Habis (Max 2x/Hari)' : 'Kirim Armada'}
            </button>
        `;
        container.appendChild(card);
    });
}

window.startExpedition = function(aeId) {
    if (gameState.expeditionCountToday >= 2) {
        alert("Batas maksimal 2 kali ekspedisi per hari telah tercapai!");
        return;
    }
    if (gameState.activeExpedition) { alert("Selesaikan ekspedisi berjalan!"); return; }

    const ae = gameState.availableExpeditions.find(x => x.id == aeId);
    if (!ae) return;

    const expType = ALL_EXPEDITION_MASTER.find(x => x.id === ae.expId);
    if (!expType) return;

    audioFX.playSuccess();
    gameState.expeditionCountToday++;
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
            let riskVal = expType.risk;
            if (gameState.officers['siti_mawar']) riskVal -= 0.15;

            if (Math.random() > riskVal) {
                audioFX.playSuccess();
                gameState.money += expType.reward;
                setAssistantMessage(`Ekspedisi sukses! +Rp ${expType.reward.toLocaleString('id-ID')}`);
                logMessage(`Ekspedisi '${expType.name}' sukses! (+Rp ${expType.reward.toLocaleString('id-ID')})`, 'success');
            } else {
                audioFX.playDanger();
                removeRandomMembers(1, 2);
                setAssistantMessage(`Ekspedisi gagal disadap aparat! Pasukan gugur.`);
                logMessage(`Ekspedisi '${expType.name}' gagal. Pasukan gugur.`, 'danger');
            }
        }
        gameState.activeExpedition = null;
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
    const sisaSec = Math.max(0, Math.ceil((gameState.activeExpedition.endTime - Date.now()) / 1000));
    container.innerHTML = `<div class="game-card"><h4>Ekspedisi Berjalan</h4><p>Sisa Waktu Perjalanan: <strong class="text-yellow">${sisaSec}s</strong></p></div>`;
}

// EKSPANSI INTERNASIONAL
function renderGlobalTargets() {
    const container = document.getElementById('global-targets-list');
    const descEl = document.getElementById('global-status-desc');
    if (!container) return;
    container.innerHTML = '';

    const isAllAICleared = checkAllIndoAICleared();

    if (isAllAICleared) {
        if (descEl) {
            descEl.innerText = "SELAMAT! 100% Wilayah Indonesia telah Anda kuasai! Akses Kartel Dunia Terbuka!";
            descEl.className = "text-green";
        }
    } else {
        if (descEl) {
            descEl.innerText = "Terkunci: Anda wajib menguasai 100% wilayah AI di Indonesia sebelum bisa melakukan ekspansi internasional!";
            descEl.className = "text-red";
        }
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
            ${isControlled ? '<span class="text-green">✔ Kartel Berhasil Ditaklukkan</span>' : 
              `<button class="btn btn-red" ${!isAllAICleared ? 'disabled' : ''} onclick="conquerGlobal('${g.id}')">Taklukkan Kartel</button>`}
        `;
        container.appendChild(card);
    });
}

window.conquerGlobal = function(gId) {
    if (!checkAllIndoAICleared()) {
        alert("Anda wajib menguasai seluruh kota AI di Indonesia terlebih dahulu!");
        return;
    }

    const g = GLOBAL_TARGETS.find(x => x.id === gId);
    if (getPlayerTotalPower() < g.reqPower) {
        alert(`Power kurang! Butuh minimal ${g.reqPower} PWR untuk menaklukkan ${g.name}.`);
        return;
    }
    audioFX.playSuccess();
    gameState.controlledGlobal[gId] = true;
    logMessage(`BERHASIL MENAKLUKKAN KARTEL INTERNASIONAL: ${g.name}!`, 'success');
    renderGlobalTargets();
    updateUI();
};

// ORMAS & SUAP
window.donateOrmas = function() {
    if (gameState.money >= 15000000) {
        audioFX.playSuccess();
        gameState.money -= 15000000;
        gameState.heat = Math.max(0, (gameState.heat || 0) - 10);
        logMessage("Bakti sosial sukses. Heat -10%.", 'success');
        updateUI();
    } else alert("Uang tidak cukup!");
};

window.bribePolice = function() {
    if (gameState.money >= 25000000) {
        audioFX.playSuccess();
        gameState.money -= 25000000;
        gameState.heat = Math.max(0, (gameState.heat || 0) - 30);
        logMessage("Suap Polda sukses. Heat -30%.", 'success');
        updateUI();
    } else alert("Uang tidak cukup!");
};

// EVENT ACAK
function scheduleNextRandomEvent() {
    const randomMs = (Math.floor(Math.random() * 120) + 60) * 1000;
    setTimeout(() => {
        triggerRandomEvent();
        scheduleNextRandomEvent();
    }, randomMs);
}

function triggerRandomEvent() {
    if (!currentUser || !gameState.setupDone || gameState.isJailed) return;
    audioFX.playSiren();
    currentActiveEvent = EVENTS_MASTER[Math.floor(Math.random() * EVENTS_MASTER.length)];
    eventTimerSec = 20;
    showEventModal(currentActiveEvent);
}

function showEventModal(ev) {
    document.getElementById('event-title').innerText = ev.title;
    document.getElementById('event-desc').innerText = ev.desc;
    document.getElementById('event-timer-count').innerText = eventTimerSec;

    const choicesEl = document.getElementById('event-choices');
    choicesEl.innerHTML = '';

    ev.choices.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-gold full-btn';
        btn.style.marginBottom = '8px';
        btn.innerText = c.text;
        btn.onclick = () => handleEventAction(c.act, c.text);
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
        const defaultChoice = currentActiveEvent.choices[0];
        logMessage(`[TIMEOUT] Waktu habis! Sistem memilih otomatis: '${defaultChoice.text}'`, 'danger');
        handleEventAction(defaultChoice.act, defaultChoice.text);
    }
}

// PERBAIKAN BIAYA SABOTASE (RP 15.000.000)
function handleEventAction(act, choiceText = '') {
    document.getElementById('event-modal').classList.add('hidden');
    currentActiveEvent = null;

    switch(act) {
        case 'fight_rival':
            if (getPlayerTotalPower() >= 120) {
                audioFX.playSuccess();
                logMessage("Berhasil memukul mundur geng rival!", 'success');
            } else {
                audioFX.playDanger();
                const penalty = Math.min(gameState.money, 5000000);
                gameState.money -= penalty;
                logMessage(`Kekuatan kurang! Bisnis diserang, rugi Rp ${penalty.toLocaleString('id-ID')}.`, 'danger');
            }
            break;
        case 'pay_peace':
            if (gameState.money >= 3000000) {
                gameState.money -= 3000000;
                logMessage("Membayar Rp 3 Juta untuk uang damai.", 'danger');
            } else {
                logMessage("Kas tidak cukup bayar uang damai! Markas dijarah rival.", 'danger');
                gameState.money = 0;
            }
            break;
        case 'close_business':
            gameState.isBusinessClosedTimer = 120;
            logMessage("Bisnis ditutup sementara selama 2 menit (Sidak Polisi).", 'danger');
            break;
        case 'ignore_heat':
            gameState.heat = Math.min(100, (gameState.heat || 0) + 15);
            logMessage("Menghiraukan sidak polisi. Heat Level +15%.", 'danger');
            break;
        case 'sabotage_fix':
            if (gameState.money >= 15000000) {
                audioFX.playSuccess();
                gameState.money -= 15000000;
                logMessage("Memperbaiki kerusakan bisnis akibat sabotase (Rp 15.000.000).", 'success');
            } else {
                logMessage("Uang kas tidak cukup untuk perbaikan sabotase (Butuh Rp 15 Juta)!", 'danger');
                handleEventAction('sabotage_destroy', 'Hancur');
                return;
            }
            break;
        case 'sabotage_destroy':
            const bizKeys = Object.keys(gameState.businesses).filter(k => gameState.businesses[k] > 0);
            if (bizKeys.length > 0) {
                const targetBiz = bizKeys[0];
                gameState.businesses[targetBiz]--;
                logMessage(`Bisnis '${targetBiz}' hancur disabotase mafia AI!`, 'danger');
            } else {
                const loss = Math.min(gameState.money, 5000000);
                gameState.money -= loss;
                logMessage(`Tidak ada bisnis aktif. Sabotase AI memotong kas sebesar Rp ${loss.toLocaleString('id-ID')}.`, 'danger');
            }
            break;
        case 'buy_blackmarket':
            if (gameState.money >= 10000000) {
                audioFX.playSuccess();
                gameState.money -= 10000000;
                gameState.weapons = (gameState.weapons || 0) + 2;
                logMessage("Membeli pasokan senjata gelap borongan (+50 PWR).", 'success');
            } else {
                alert("Uang kas tidak cukup (butuh Rp 10 Juta)! Transaksi dibatalkan.");
                logMessage("Gagal membeli senjata gelap karena kas kurang.", 'danger');
            }
            break;
        case 'ott_destroy':
            if (gameState.money >= 5000000) {
                audioFX.playSuccess();
                gameState.money -= 5000000;
                gameState.heat = Math.max(0, (gameState.heat || 0) - 20);
                logMessage("Dokumen rahasia dimusnahkan. Biaya kurir Rp 5 Juta, Heat -20%.", 'success');
            } else {
                logMessage("Kas kurang untuk bayar kurir pemusnah dokumen!", 'danger');
            }
            break;
        case 'ott_bribe':
            if (gameState.money >= 20000000) {
                gameState.money -= 20000000;
                if (Math.random() > 0.25) {
                    audioFX.playSuccess();
                    gameState.heat = 0;
                    logMessage("Penyidik KPK berhasil disogok Rp 20 Juta! Heat bersih 0%.", 'success');
                } else {
                    alert("Sogokan ditolak penyidik jujur! Anda ditangkap!");
                    triggerPlayerJail();
                }
            } else alert("Uang kas tidak cukup untuk menyogok penyidik KPK!");
            break;
        case 'trait_pay':
            if (gameState.money >= 4000000) {
                audioFX.playSuccess();
                gameState.money -= 4000000;
                logMessage("Membayar informan Rp 4 Juta untuk bungkam.", 'success');
            } else {
                logMessage("Uang kurang! Bocoran lokasi kas membuat modal hilang Rp 3 Juta.", 'danger');
                gameState.money = Math.max(0, gameState.money - 3000000);
            }
            break;
        case 'trait_kill':
            if (gameState.members && gameState.members.length > 0) {
                removeRandomMembers(1, 1);
                logMessage("Pengkhianat dieksekusi mati. 1 Pasukan hilang.", 'danger');
            } else {
                logMessage("Tidak ada pasukan untuk eksekusi! Informasi kas bocor.", 'danger');
            }
            break;
        case 'media_bribe':
            if (gameState.money >= 6000000) {
                audioFX.playSuccess();
                gameState.money -= 6000000;
                logMessage("Suap wartawan Rp 6 Juta sukses.", 'success');
            } else {
                logMessage("Uang kurang untuk suap wartawan! Media merilis berita, Heat +10%.", 'danger');
                gameState.heat = Math.min(100, (gameState.heat || 0) + 10);
            }
            break;
        case 'media_terror':
            gameState.heat = Math.min(100, (gameState.heat || 0) + 20);
            logMessage("Menteror media! Heat Level +20%.", 'danger');
            break;
        case 'social_aid':
            if (gameState.money >= 5000000) {
                audioFX.playSuccess();
                gameState.money -= 5000000;
                gameState.heat = Math.max(0, (gameState.heat || 0) - 10);
                logMessage("Membagi sembako ke warga. Heat -10%.", 'success');
            } else {
                logMessage("Kas tidak cukup untuk beli sembako warga!", 'danger');
            }
            break;
        case 'dispers_crowd':
            gameState.heat = Math.min(100, (gameState.heat || 0) + 15);
            logMessage("Membubarkan demo warga secara paksa! Heat +15%.", 'danger');
            break;
        case 'alliance_yes':
            audioFX.playSuccess();
            gameState.money += 15000000;
            logMessage("Aliansi Ormas diterima! Mendapatkan dana Rp 15 Juta.", 'success');
            break;
        case 'alliance_no':
            removeRandomMembers(1, 1);
            logMessage("Menolak aliansi Ormas! Terjadi bentrok, 1 pasukan gugur.", 'danger');
            break;
        case 'mentor_money':
            audioFX.playSuccess();
            gameState.money += 50000000;
            logMessage("Suntikan modal mentor diterima! Kas +Rp 50 Juta.", 'success');
            break;
        default:
            logMessage("Event selesai tanpa dampak langsung.", 'info');
            break;
    }
    updateUI();
}

window.toggleGuideModal = function(show) {
    const m = document.getElementById('guide-modal');
    if (show) m.classList.remove('hidden');
    else m.classList.add('hidden');
};

window.toggleTierInfoModal = function(show) {
    const m = document.getElementById('tier-info-modal');
    if (show) m.classList.remove('hidden');
    else m.classList.add('hidden');
};

window.resetGameProgress = async function() {
    if (!confirm("Reset total progress?")) return;
    gameState = createDefaultGameState();
    payoutCountdownSec = 60;
    await cloudAutosaveInterval();
    location.reload();
};

function logMessage(msg, type = '') {
    if (!currentUser) return;
    if (!gameState.gameLogs) gameState.gameLogs = [];

    const newLog = {
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        msg: msg,
        type: type
    };

    gameState.gameLogs.unshift(newLog);

    if (gameState.gameLogs.length > 5) {
        gameState.gameLogs = gameState.gameLogs.slice(0, 5);
    }

    renderLogs();
    cloudAutosaveInterval();
}

function renderLogs() {
    const logsContainer = document.getElementById('game-logs');
    if (!logsContainer) return;

    logsContainer.innerHTML = '';
    if (!gameState.gameLogs || gameState.gameLogs.length === 0) {
        logsContainer.innerHTML = '<div class="log-entry">Belum ada catatan operasional.</div>';
        return;
    }

    gameState.gameLogs.forEach(log => {
        const entry = document.createElement('div');
        entry.className = `log-entry ${log.type}`;
        entry.innerText = `[${log.time}] ${log.msg}`;
        logsContainer.appendChild(entry);
    });
}

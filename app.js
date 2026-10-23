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
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "./firebase-db.js";

import { 
    PROVINCES, 
    GLOBAL_TARGETS, 
    RIVAL_NAMES, 
    CRIMES_DATA, 
    BUSINESS_DATA, 
    ALL_EXPEDITION_MASTER, 
    OFFICERS_MASTER, 
    EVENTS_MASTER 
} from "./config.js";

// WEB AUDIO SYNTHESIZER
class AudioSynth {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSuccess() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playDanger() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }

    playSiren() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.25);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
    }

    playWarDrum() {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    }
}

const audioFX = new AudioSynth();

function createDefaultGameState() {
    return {
        setupDone: false,
        username: '',
        homeProvince: 'dki',
        homeCity: 'Jakarta Pusat',
        money: 5000000,
        weapons: 0,
        heat: 0,
        isJailed: false,
        jailTimerSec: 0,
        jailTimesCount: 0,
        members: [
            { id: Date.now() + 1, power: Math.floor(Math.random() * 5) + 1 },
            { id: Date.now() + 2, power: Math.floor(Math.random() * 5) + 1 }
        ],
        jailedMembers: [],
        officers: {},
        businesses: {},
        controlledCities: {},
        controlledGlobal: {},
        activeExpedition: null,
        availableExpeditions: [],
        activeCrime: null,
        activePvPWars: [],
        incomingPvPAttack: [],
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

let jailMiniGamePattern = [];
let jailMiniGameUserIdx = 0;

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('auth-modal').classList.remove('hidden');
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

            document.getElementById('auth-modal').classList.add('hidden');
            const cloudData = await loadUserDataFromCloud(user.uid);
            if (cloudData) gameState = { ...createDefaultGameState(), ...cloudData };

            gameState.username = user.email.split('@')[0];

            const cloudPilkada = await fetchGlobalPilkadaData();
            if (cloudPilkada) globalPilkada = cloudPilkada;

            if (!gameState.setupDone) {
                document.getElementById('setup-modal').classList.remove('hidden');
                document.getElementById('game-container').classList.add('hidden');
            } else {
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('game-container').classList.remove('hidden');
                initUI();
                renderLogs();

                checkIncomingPvPDefenseModal();
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

window.logout = function() { 
    signOut(auth).catch((err) => console.error("SignOut error:", err)); 
};

// SETUP BASECAMP MULTIPLAYER
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

    jailTicker();
    expeditionTicker();
    crimeSingleTicker();
    eventModalTimerTicker();
    pvpWarsTicker();
    pilkadaTicker();
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
    income += controlledCount * 1000000;

    GLOBAL_TARGETS.forEach(g => {
        if (gameState.controlledGlobal[g.id]) income += g.rewardPerMin;
    });
    return income;
}

function calculateTotalExpenses1Min() {
    let baseExpense = gameState.members.length * 150000;
    if (gameState.officers['bambang_lintah']) baseExpense *= 0.8;
    return baseExpense;
}

function getPlayerTotalPower() {
    let pwr = gameState.weapons * 25;
    gameState.members.forEach(m => pwr += m.power);
    return pwr;
}

function getNextJailDurationSec() {
    const times = gameState.jailTimesCount || 0;
    const baseSec = 120;
    return Math.floor(baseSec * Math.pow(1.5, times));
}

function checkAllIndoAICleared() {
    let totalAICities = 0;
    PROVINCES.forEach(p => totalAICities += p.cities.length);
    const playerControlledCount = Object.keys(gameState.controlledCities).length;
    return playerControlledCount >= totalAICities;
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
    updateUI();
}

async function updateUI() {
    if (!gameState.setupDone) return;

    globalOccupiedMap = await fetchGlobalOccupiedCities();

    document.getElementById('user-display-name').innerText = gameState.username;
    document.getElementById('player-location-badge').innerText = `Basecamp: ${gameState.homeCity}`;

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
    const nextJailSec = getNextJailDurationSec();

    document.getElementById('stat-money').innerText = `Rp ${gameState.money.toLocaleString('id-ID')}`;
    document.getElementById('stat-income').innerText = `+Rp ${income.toLocaleString('id-ID')}`;
    document.getElementById('stat-expenses').innerText = `-Rp ${expenses.toLocaleString('id-ID')}`;
    document.getElementById('stat-members').innerText = `${gameState.members.length} Orang`;
    document.getElementById('stat-power').innerText = `${myPwr} PWR`;
    document.getElementById('stat-next-jail').innerText = `${(nextJailSec/60).toFixed(1)} mnt`;
    document.getElementById('stat-heat').innerText = `${gameState.heat}%`;
    document.getElementById('heat-bar').style.width = `${gameState.heat}%`;

    renderTurfMap();
    renderMembersList();
    renderJailedMembersList();
    renderGlobalTargets();
}

function setAssistantMessage(msg) {
    const el = document.getElementById('assistant-message');
    if (el) el.innerText = `"${msg}"`;
}

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.target) event.target.classList.add('active');

    if (tabId === 'leaderboard-tab') renderLeaderboard();
    if (tabId === 'politics-tab') renderPilkadaUI();
};

async function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    const players = await fetchLeaderboardData();
    if (players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada data pemain lain.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    players.forEach((p, idx) => {
        const tr = document.createElement('tr');
        if (p.uid === currentUser.uid) tr.style.background = 'rgba(223, 168, 55, 0.15)';

        tr.innerHTML = `
            <td>#${idx + 1}</td>
            <td><strong>${p.username}</strong> ${p.uid === currentUser.uid ? '<span class="text-yellow">(Anda)</span>' : ''}</td>
            <td class="text-blue">${p.cities} Kota</td>
            <td class="text-green">Rp ${p.money.toLocaleString('id-ID')}</td>
        `;
        tbody.appendChild(tr);
    });
}

// PETA WILAYAH & PERANG PVP 15 MENIT (REVISI SINKRONISASI KEPEMILIKAN)
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
    prov.cities.forEach(cityName => {
        const isControlledByMe = gameState.controlledCities[cityName];
        const occupant = globalOccupiedMap[cityName];

        let cardClass = 'controlled-enemy';
        let statusText = 'Dikuasai AI Rival';

        if (isControlledByMe) {
            cardClass = 'controlled-player';
            statusText = 'Wilayah Anda';
        } else if (occupant) {
            cardClass = 'controlled-otherplayer';
            statusText = `Dikuasai Pemain: ${occupant.username}`;
        }

        const card = document.createElement('div');
        card.className = `turf-card ${cardClass}`;
        card.innerHTML = `
            <h4>${cityName}</h4>
            <p style="font-size:0.85rem;">Status: <strong>${statusText}</strong></p>
            ${isControlledByMe ? '<span class="text-green">✔ Wilayah Aman</span>' :
              occupant ? `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" onclick="startPvPWar15Min('${cityName}')">Serang Pemain (15 Mnt)</button>` :
              `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" onclick="reclaimCity('${cityName}')">Serang & Rebut AI</button>`}
        `;
        grid.appendChild(card);
    });
}

// MEREBUT KOTA DARI AI RIVAL (HANYA UNTUK KOTA KOSONG/AI)
window.reclaimCity = async function(cityName) {
    const occupant = globalOccupiedMap[cityName];
    if (occupant) {
        // Jika kota ternyata dikuasai pemain lain, alihkan ke PvP perang
        startPvPWar15Min(cityName);
        return;
    }

    const myPwr = getPlayerTotalPower();
    if (myPwr < 100) {
        alert("Butuh minimal 100 PWR untuk menyerang kota!");
        return;
    }

    if (Math.random() < 0.6) {
        audioFX.playSuccess();
        gameState.controlledCities[cityName] = true;
        
        // UPDATE STATUS KOTA KE GLOBAL DATABASE
        await updateCityOccupantGlobal(cityName, currentUser.uid, gameState.username);

        setAssistantMessage(`Sukses! Kota ${cityName} berhasil direbut.`);
        logMessage(`Berhasil merebut wilayah ${cityName}!`, 'success');
        await cloudAutosaveInterval();
    } else {
        audioFX.playDanger();
        removeRandomMembers(1, 2);
        setAssistantMessage(`Gagal menyerang ${cityName}. Pasukan terpukul mundur.`);
        logMessage(`Gagal menyerang ${cityName}.`, 'danger');
    }
    updateUI();
};

window.startPvPWar15Min = async function(cityName) {
    const occupant = globalOccupiedMap[cityName];
    if (!occupant) {
        reclaimCity(cityName);
        return;
    }

    if (occupant.uid === currentUser.uid) {
        alert("Kota ini sudah milik Anda!");
        return;
    }

    const myPwr = getPlayerTotalPower();
    if (myPwr < 150) {
        alert("Butuh minimal 150 PWR untuk menyatakan perang pada kota pemain!");
        return;
    }

    const targetCloudData = await loadUserDataFromCloud(occupant.uid);
    if (targetCloudData && targetCloudData.peaceShieldUntil && Date.now() < targetCloudData.peaceShieldUntil) {
        alert(`Kota ${cityName} sedang dilindungi Peace Shield! Tidak bisa diserang.`);
        return;
    }

    audioFX.playWarDrum();
    const warEndTime = Date.now() + (15 * 60 * 1000);
    const newWar = {
        warId: Date.now(),
        cityName: cityName,
        targetUid: occupant.uid,
        targetUsername: occupant.username,
        endTime: warEndTime,
        attackerPwr: myPwr,
        defenderBonusPwr: 0
    };

    if (!gameState.activePvPWars) gameState.activePvPWars = [];
    gameState.activePvPWars.push(newWar);

    if (targetCloudData) {
        if (!targetCloudData.incomingPvPAttack) targetCloudData.incomingPvPAttack = [];
        targetCloudData.incomingPvPAttack.push({
            warId: newWar.warId,
            attackerUsername: gameState.username,
            cityName: cityName,
            endTime: warEndTime
        });
        await saveUserDataToCloud(occupant.uid, targetCloudData);
    }

    logMessage(`MEMULAI SERANGAN 15 MENIT ke ${cityName} milik ${occupant.username}! Pasukan sedang dalam perjalanan.`, 'danger');
    await cloudAutosaveInterval();
    updateUI();
};

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
                (targetCloudData.members || []).forEach(m => targetPwr += m.power);
                if (targetCloudData.defendingMercenaries) targetPwr += 100;
            }

            if (globalPilkada.winnerId === 1) targetPwr = Math.floor(targetPwr * 1.3);

            if (war.attackerPwr > targetPwr) {
                audioFX.playSuccess();
                gameState.controlledCities[war.cityName] = true;
                let lootedCash = 15000000;
                if (targetCloudData && targetCloudData.money) {
                    lootedCash = Math.min(50000000, Math.floor(targetCloudData.money * 0.10));
                }
                gameState.money += lootedCash;

                // FIX SINKRONISASI GLOBAL: UPDATE PEMILIK KOTA & HAPUS DARI PEMAIN LAMA
                await updateCityOccupantGlobal(war.cityName, currentUser.uid, gameState.username);

                if (targetCloudData) {
                    if (targetCloudData.controlledCities) {
                        delete targetCloudData.controlledCities[war.cityName];
                    }
                    targetCloudData.money = Math.max(0, targetCloudData.money - lootedCash);
                    targetCloudData.peaceShieldUntil = Date.now() + (12 * 60 * 60 * 1000);
                    delete targetCloudData.defendingMercenaries;
                    await saveUserDataToCloud(war.targetUid, targetCloudData);
                }

                logMessage(`PERANG SELESAI: Berhasil merebut ${war.cityName} dari ${war.targetUsername} & menjarah Rp ${lootedCash.toLocaleString('id-ID')}!`, 'success');
            } else {
                audioFX.playDanger();
                removeRandomMembers(1, 3);
                logMessage(`PERANG SELESAI: Serangan ke ${war.cityName} dipukul mundur oleh pertahanan ${war.targetUsername}. Pasukan gugur.`, 'danger');
            }

            gameState.activePvPWars = gameState.activePvPWars.filter(w => w.warId !== war.warId);
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
    grid.innerHTML = '';

    if (!gameState.activePvPWars || gameState.activePvPWars.length === 0) {
        grid.innerHTML = '<p class="text-muted">Tidak ada armada perang berjalan.</p>';
        return;
    }

    const now = Date.now();
    gameState.activePvPWars.forEach(w => {
        const sisaSec = Math.max(0, Math.ceil((w.endTime - now) / 1000));
        const min = Math.floor(sisaSec / 60);
        const sec = sisaSec % 60;

        const card = document.createElement('div');
        card.className = 'game-card controlled-enemy';
        card.innerHTML = `
            <div>
                <h4>Serangan ke ${w.cityName}</h4>
                <p>Target: <strong>${w.targetUsername}</strong></p>
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
    if (gameState.money >= 25000000) {
        audioFX.playSuccess();
        gameState.money -= 25000000;
        gameState.defendingMercenaries = true;
        alert("Berhasil menyewa pasukan bayaran! Pertahanan kota meningkat +100 PWR.");
        logMessage("Sewa Pasukan Bayaran Rp 25 Juta untuk pertahanan kota.", 'success');
        document.getElementById('pvp-defense-modal').classList.add('hidden');
        await cloudAutosaveInterval();
        updateUI();
    } else alert("Uang kas tidak cukup (Butuh Rp 25 Juta)!");
};

window.ignoreDefense = function() {
    document.getElementById('pvp-defense-modal').classList.add('hidden');
};

// BEKING POLITIK & PILKADA
function renderPilkadaUI() {
    const phaseLabel = document.getElementById('politics-phase-label');
    const timerLabel = document.getElementById('politics-timer-count');
    const govBadge = document.getElementById('active-governor-badge');
    const newsContainer = document.getElementById('politics-news-feed');
    const grid = document.getElementById('paslon-list-grid');

    if (!phaseLabel || !grid) return;

    phaseLabel.innerText = globalPilkada.phase;
    if (globalPilkada.winnerId) {
        const winnerObj = globalPilkada.paslon.find(x => x.id === globalPilkada.winnerId);
        if (govBadge) govBadge.innerText = winnerObj ? winnerObj.name : 'Belum Ada';
    } else {
        if (govBadge) govBadge.innerText = 'Masa Kampanye / Kosong';
    }

    if (newsContainer) {
        newsContainer.innerHTML = '';
        (globalPilkada.newsFeed || []).forEach(news => {
            const div = document.createElement('div');
            div.style.marginBottom = '4px';
            div.innerText = `• ${news}`;
            newsContainer.appendChild(div);
        });
    }

    grid.innerHTML = '';
    let totalAllModal = 0;
    globalPilkada.paslon.forEach(p => totalAllModal += p.totalFund);

    globalPilkada.paslon.forEach(p => {
        let electPct = totalAllModal > 0 ? ((p.totalFund / totalAllModal) * 100).toFixed(1) : (100 / globalPilkada.paslon.length).toFixed(1);
        const myContrib = (p.usersContrib && p.usersContrib[currentUser.uid]) ? p.usersContrib[currentUser.uid] : 0;

        const card = document.createElement('div');
        card.className = `game-card ${globalPilkada.winnerId === p.id ? 'controlled-player' : ''}`;
        card.innerHTML = `
            <div>
                <h4>${p.name}</h4>
                <p>Visi & Buff: <strong class="text-yellow">${p.desc}</strong></p>
                <p>Elektabilitas Peluang: <strong class="text-green">${electPct}%</strong></p>
                <p>Modal Terkumpul: Rp ${p.totalFund.toLocaleString('id-ID')}</p>
                <p>Suntikan Anda: <span class="text-blue">Rp ${myContrib.toLocaleString('id-ID')}</span></p>
            </div>
            ${globalPilkada.phase === 'KAMPANYE' ? `
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button class="btn btn-gold btn-xs" style="flex:1;" onclick="injectPoliticalFund(${p.id}, 10000000)">Suntik Rp 10Jt</button>
                    <button class="btn btn-red btn-xs" style="flex:1;" onclick="seranganFajar(${p.id})">Serangan Fajar (Rp 25Jt)</button>
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
            globalPilkada.newsFeed.unshift("Masa Kampanye ditutup! Lapor hitung cepat / Quick Count dimulai...");
            executePilkadaWinnerSelection();
        } else if (globalPilkada.phase === 'QUICK_COUNT') {
            globalPilkada.phase = 'MASA_JABATAN';
            globalPilkada.phaseEndTime = now + (3 * 24 * 60 * 60 * 1000);
        } else if (globalPilkada.phase === 'MASA_JABATAN') {
            globalPilkada.phase = 'KAMPANYE';
            globalPilkada.phaseEndTime = now + (10 * 60 * 60 * 1000);
            globalPilkada.winnerId = null;
            globalPilkada.paslon.forEach(p => { p.totalFund = 0; p.usersContrib = {}; });
            globalPilkada.newsFeed.unshift("Masa jabatan usai! Pilkada Serentak periode baru resmi dibuka.");
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
    globalPilkada.newsFeed.unshift(`HASIL QUICK COUNT: ${winner.name} secara mengejutkan MENANG Pilkada!`);
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
            globalPilkada.newsFeed.unshift(`${gameState.username} memberikan suntikan dana Rp ${amount.toLocaleString('id-ID')} untuk ${p.name}`);
        }
        saveGlobalPilkadaData(globalPilkada);
        logMessage(`Suntikan modal politik Rp ${amount.toLocaleString('id-ID')} sukses.`, 'success');
        renderPilkadaUI();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.seranganFajar = function(paslonId) {
    if (gameState.money >= 25000000) {
        audioFX.playWarDrum();
        gameState.money -= 25000000;
        const p = globalPilkada.paslon.find(x => x.id === paslonId);
        if (p) {
            p.totalFund += 35000000;
            if (!p.usersContrib) p.usersContrib = {};
            p.usersContrib[currentUser.uid] = (p.usersContrib[currentUser.uid] || 0) + 25000000;
            globalPilkada.newsFeed.unshift(`🚨 DANA GELAP / SERANGAN FAJAR dieksekusi untuk ${p.name}! Suara mendongkrak pesat!`);
        }
        saveGlobalPilkadaData(globalPilkada);
        logMessage("Serangan Fajar dieksekusi! (Rp 25 Juta).", 'danger');
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

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
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

    if (gameState.members.length < c.minMembers || getPlayerTotalPower() < c.minPower) {
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
                gameState.heat = Math.min(100, gameState.heat + heatInc);
                setAssistantMessage(`Aksi '${c.name}' sukses! Mendapatkan Rp ${earned.toLocaleString('id-ID')}.`);
                logMessage(`Aksi '${c.name}' sukses! (+Rp ${earned.toLocaleString('id-ID')})`, 'success');

                if (gameState.heat >= 100) triggerPlayerJail();
            } else {
                audioFX.playDanger();
                gameState.heat = Math.min(100, gameState.heat + (heatInc * 2));
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
        audioFX.playSuccess();
        gameState.money -= b.cost;
        gameState.businesses[bId] = (gameState.businesses[bId] || 0) + 1;
        logMessage(`Membeli bisnis '${b.name}'.`, 'success');
        renderBusiness();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

window.buyMember = function() {
    const cost = 2500000;
    if (gameState.money >= cost) {
        audioFX.playSuccess();
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
        audioFX.playSuccess();
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
        grid.innerHTML = '<p class="text-muted">Tidak ada pasukan aktif.</p>';
        return;
    }

    gameState.members.forEach((m, idx) => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>Pasukan #${idx + 1}</h4>
                <p>Kekuatan: <strong>${m.power} PWR</strong> | Upah: Rp 150.000 / mnt</p>
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
    if (gameState.members.length === 0) return;
    const count = Math.min(gameState.members.length, Math.floor(Math.random() * (max - min + 1)) + min);
    for (let i = 0; i < count; i++) gameState.members.pop();
}

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

// PENJARA & MINI GAME SEKERING LISTRIK
function triggerPlayerJail() {
    audioFX.playSiren();
    gameState.isJailed = true;
    gameState.jailTimesCount = (gameState.jailTimesCount || 0) + 1;
    gameState.jailTimerSec = getNextJailDurationSec();

    document.getElementById('jail-modal').classList.remove('hidden');
    setAssistantMessage(`Ditangkap Polda! Ini penangkapan ke-${gameState.jailTimesCount}. Waktu tahanan: ${Math.floor(gameState.jailTimerSec/60)} menit.`);
    logMessage(`Ditangkap Polda! Tahanan ke-${gameState.jailTimesCount} (${Math.floor(gameState.jailTimerSec/60)} menit).`, 'danger');
    initJailMiniGame();
}

function initJailMiniGame() {
    const grid = document.getElementById('jail-minigame-grid');
    const status = document.getElementById('jail-minigame-status');
    if (!grid) return;
    grid.innerHTML = '';
    status.innerText = "Tekan Saklar 1-3 Sesuai Urutan!";

    jailMiniGamePattern = [Math.floor(Math.random()*3)+1, Math.floor(Math.random()*3)+1];
    jailMiniGameUserIdx = 0;

    for (let i = 1; i <= 3; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-gold';
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
            status.innerText = "RETAS SUKSES! Masa Tahanan Dipotong 30 Detik!";
            initJailMiniGame();
        } else {
            status.innerText = "Saklar Tepat! Lanjutkan saklar berikutnya...";
        }
    } else {
        audioFX.playDanger();
        status.innerText = "Konslet! Urutan salah, coba lagi!";
        jailMiniGameUserIdx = 0;
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
    let cost = 50000000;
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
    if (gameState.money >= 15000000) {
        gameState.money -= 15000000;
        if (Math.random() < 0.45) {
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
    } else alert("Uang tidak cukup!");
};

window.jailBreakout = function() {
    if (gameState.money >= 5000000) {
        gameState.money -= 5000000;
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
    } else alert("Uang tidak cukup!");
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
        div.innerHTML = `PWR ${m.power} (${m.timerSec}s) <button class="btn-xs btn-gold" onclick="bribeFreeJailedMember(${m.id})">Suap (Rp 10Jt)</button>`;
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

    if (gameState.money >= 10000000) {
        audioFX.playSuccess();
        gameState.money -= 10000000;
        gameState.members.push({ id: targetMember.id, power: targetMember.power });
        gameState.jailedMembers = gameState.jailedMembers.filter(x => x.id !== mId);
        logMessage("Anak buah berhasil dibebaskan dari sel melalui suap.", 'success');
        updateUI();
    } else alert("Uang tidak cukup untuk menyuap!");
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
            descEl.innerText = "Terkunci: Anda wajib menguasai 100% kota AI di Indonesia sebelum bisa melakukan ekspansi internasional!";
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

window.donateOrmas = function() {
    if (gameState.money >= 15000000) {
        audioFX.playSuccess();
        gameState.money -= 15000000;
        gameState.heat = Math.max(0, gameState.heat - 15);
        logMessage("Bakti sosial sukses. Heat -15%.", 'success');
        updateUI();
    } else alert("Uang tidak cukup!");
};

window.bribePolice = function() {
    if (gameState.money >= 40000000) {
        audioFX.playSuccess();
        gameState.money -= 40000000;
        gameState.heat = Math.max(0, gameState.heat - 25);
        logMessage("Suap polda sukses. Heat -25%.", 'success');
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

function handleEventAction(act, choiceText = '') {
    document.getElementById('event-modal').classList.add('hidden');
    currentActiveEvent = null;

    switch(act) {
        case 'fight_rival':
            if (getPlayerTotalPower() >= 150) {
                audioFX.playSuccess();
                logMessage("Berhasil memukul mundur geng rival!", 'success');
            } else {
                audioFX.playDanger();
                const penalty = Math.min(gameState.money, 15000000);
                gameState.money -= penalty;
                logMessage(`Kekuatan kurang! Bisnis diserang, rugi Rp ${penalty.toLocaleString('id-ID')}.`, 'danger');
            }
            break;
        case 'pay_peace':
            if (gameState.money >= 10000000) {
                gameState.money -= 10000000;
                logMessage("Membayar Rp 10 Juta untuk uang damai.", 'danger');
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
            gameState.heat = Math.min(100, gameState.heat + 15);
            logMessage("Menghiraukan sidak polisi. Heat Level +15%.", 'danger');
            break;
        case 'sabotage_fix':
            if (gameState.money >= 15000000) {
                audioFX.playSuccess();
                gameState.money -= 15000000;
                logMessage("Memperbaiki bisnis yang disabotase (Rp 15 Juta).", 'success');
            } else {
                logMessage("Uang kas tidak cukup untuk perbaikan sabotase!", 'danger');
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
                const loss = Math.min(gameState.money, 10000000);
                gameState.money -= loss;
                logMessage(`Tidak ada bisnis aktif. Sabotase AI memotong kas sebesar Rp ${loss.toLocaleString('id-ID')}.`, 'danger');
            }
            break;
        case 'buy_blackmarket':
            if (gameState.money >= 20000000) {
                audioFX.playSuccess();
                gameState.money -= 20000000;
                gameState.weapons += 2;
                logMessage("Membeli pasokan senjata gelap borongan (+50 PWR).", 'success');
            } else {
                alert("Uang kas tidak cukup (butuh Rp 20 Juta)! Transaksi dibatalkan.");
                logMessage("Gagal membeli senjata gelap karena kas kurang.", 'danger');
            }
            break;
        case 'ott_destroy':
            if (gameState.money >= 10000000) {
                audioFX.playSuccess();
                gameState.money -= 10000000;
                gameState.heat = Math.max(0, gameState.heat - 20);
                logMessage("Dokumen rahasia dimusnahkan. Biaya kurir Rp 10 Juta, Heat -20%.", 'success');
            } else {
                logMessage("Kas kurang untuk bayar kurir pemusnah dokumen!", 'danger');
            }
            break;
        case 'ott_bribe':
            if (gameState.money >= 50000000) {
                gameState.money -= 50000000;
                if (Math.random() > 0.25) {
                    audioFX.playSuccess();
                    gameState.heat = 0;
                    logMessage("Penyidik KPK berhasil disogok Rp 50 Juta! Heat bersih 0%.", 'success');
                } else {
                    alert("Sogokan ditolak penyidik jujur! Anda ditangkap!");
                    triggerPlayerJail();
                }
            } else alert("Uang kas tidak cukup untuk menyogok penyidik KPK!");
            break;
        case 'trait_pay':
            if (gameState.money >= 8000000) {
                audioFX.playSuccess();
                gameState.money -= 8000000;
                logMessage("Membayar informan Rp 8 Juta untuk bungkam.", 'success');
            } else {
                logMessage("Uang kurang! Bocoran lokasi kas membuat modal hilang Rp 5 Juta.", 'danger');
                gameState.money = Math.max(0, gameState.money - 5000000);
            }
            break;
        case 'trait_kill':
            if (gameState.members.length > 0) {
                removeRandomMembers(1, 1);
                logMessage("Pengkhianat dieksekusi mati. 1 Pasukan hilang.", 'danger');
            } else {
                logMessage("Tidak ada pasukan untuk eksekusi! Informasi kas bocor.", 'danger');
            }
            break;
        case 'media_bribe':
            if (gameState.money >= 12000000) {
                audioFX.playSuccess();
                gameState.money -= 12000000;
                logMessage("Suap wartawan Rp 12 Juta sukses.", 'success');
            } else {
                logMessage("Uang kurang untuk suap wartawan! Media merilis berita, Heat +10%.", 'danger');
                gameState.heat = Math.min(100, gameState.heat + 10);
            }
            break;
        case 'media_terror':
            gameState.heat = Math.min(100, gameState.heat + 20);
            logMessage("Menteror media! Heat Level +20%.", 'danger');
            break;
        case 'social_aid':
            if (gameState.money >= 10000000) {
                audioFX.playSuccess();
                gameState.money -= 10000000;
                gameState.heat = Math.max(0, gameState.heat - 10);
                logMessage("Membagi sembako ke warga. Heat -10%.", 'success');
            } else {
                logMessage("Kas tidak cukup untuk beli sembako warga!", 'danger');
            }
            break;
        case 'dispers_crowd':
            gameState.heat = Math.min(100, gameState.heat + 15);
            logMessage("Membubarkan demo warga secara paksa! Heat +15%.", 'danger');
            break;
        case 'alliance_yes':
            audioFX.playSuccess();
            gameState.money += 30000000;
            logMessage("Aliansi Ormas diterima! Mendapatkan dana Rp 30 Juta.", 'success');
            break;
        case 'alliance_no':
            removeRandomMembers(1, 1);
            logMessage("Menolak aliansi Ormas! Terjadi bentrok, 1 pasukan gugur.", 'danger');
            break;
        case 'mentor_money':
            audioFX.playSuccess();
            gameState.money += 100000000;
            logMessage("Suntikan modal mentor diterima! Kas +Rp 100 Juta.", 'success');
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

window.resetGameProgress = async function() {
    if (!confirm("Reset total progress?")) return;
    gameState = createDefaultGameState();
    payoutCountdownSec = 60;
    await cloudAutosaveInterval();
    location.reload();
};

function getProvinceObj(pId) { return PROVINCES.find(p => p.id === pId); }

// LOGITAS OPERASIONAL DENGAN SYNC CLOUD
function logMessage(msg, type = '') {
    if (!currentUser) return;
    if (!gameState.gameLogs) gameState.gameLogs = [];

    const newLog = {
        time: new Date().toLocaleTimeString(),
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

import { 
    auth, 
    db, 
    fetchGlobalOccupiedCities, 
    claimBasecampGlobal, 
    updateCityOccupantGlobal,
    loadUserDataFromCloud, 
    saveUserDataToCloud, 
    fetchLeaderboardData,
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
        expeditionCountToday: 0,
        lastExpeditionDate: '',
        peaceShieldUntil: 0,
        isBusinessClosedTimer: 0
    };
}

let currentUser = null;
let currentAuthMode = 'login';
let gameState = createDefaultGameState();
let payoutCountdownSec = 60;
let currentActiveEvent = null;
let eventTimerSec = 20;
let globalOccupiedMap = {};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
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
    document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'MASUK' : 'DAFTAR';
};

window.handleAuthSubmit = async function(e) {
    e.preventDefault();
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

    await cloudAutosaveInterval();
    initUI();
    setAssistantMessage(`Basecamp didirikan di ${cName}. Selamat berjuang, Boss!`);
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
    updateUI();
}

function calculateTotalIncome1Min() {
    if (gameState.isBusinessClosedTimer > 0) return 0;
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
    if (gameState.officers['bambang_lintah']) baseExpense *= 0.8;
    return baseExpense;
}

function getPlayerTotalPower() {
    let pwr = gameState.weapons * 25;
    gameState.members.forEach(m => pwr += m.power);
    return pwr;
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
    updateUI();
}

function updateUI() {
    if (!gameState.setupDone) return;

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

    document.getElementById('stat-money').innerText = `Rp ${gameState.money.toLocaleString('id-ID')}`;
    document.getElementById('stat-income').innerText = `+Rp ${income.toLocaleString('id-ID')}`;
    document.getElementById('stat-expenses').innerText = `-Rp ${expenses.toLocaleString('id-ID')}`;
    document.getElementById('stat-members').innerText = `${gameState.members.length} Orang`;
    document.getElementById('stat-power').innerText = `${myPwr} PWR`;
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
};

// RENDERING LEADERBOARD (Revisi #1)
async function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    const players = await fetchLeaderboardData();
    if (players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Belum ada data pemain lain.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    players.forEach((p, idx) => {
        const tr = document.createElement('tr');
        if (p.uid === currentUser.uid) tr.style.background = 'rgba(223, 168, 55, 0.15)';

        tr.innerHTML = `
            <td>#${idx + 1}</td>
            <td><strong>${p.username}</strong> ${p.uid === currentUser.uid ? '<span class="text-yellow">(Anda)</span>' : ''}</td>
            <td class="text-red"><strong>${p.power} PWR</strong></td>
            <td class="text-blue">${p.cities} Kota</td>
            <td class="text-green">Rp ${p.money.toLocaleString('id-ID')}</td>
        `;
        tbody.appendChild(tr);
    });
}

// PETA WILAYAH & SERANGAN REAL-TIME PVP (Revisi #2)
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
        const isControlled = gameState.controlledCities[cityName];
        const occupant = globalOccupiedMap[cityName];
        let cardClass = 'controlled-enemy';
        let statusText = 'Dikuasai AI Rival';

        if (isControlled) {
            cardClass = 'controlled-player';
            statusText = 'Wilayah Anda';
        } else if (occupant && occupant.uid !== currentUser.uid) {
            cardClass = 'controlled-otherplayer';
            statusText = `Dikuasai Pemain: ${occupant.username}`;
        }

        const card = document.createElement('div');
        card.className = `turf-card ${cardClass}`;
        card.innerHTML = `
            <h4>${cityName}</h4>
            <p style="font-size:0.85rem;">Status: <strong>${statusText}</strong></p>
            ${isControlled ? '<span class="text-green">✔ Wilayah Aman</span>' :
              occupant && occupant.uid !== currentUser.uid ? `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" onclick="attackPlayerCity('${cityName}')">Serang & Penjarakan Pemain</button>` :
              `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" onclick="reclaimCity('${cityName}')">Serang & Rebut</button>`}
        `;
        grid.appendChild(card);
    });
}

window.reclaimCity = function(cityName) {
    const myPwr = getPlayerTotalPower();
    if (myPwr < 100) {
        alert("Butuh minimal 100 PWR untuk menyerang kota!");
        return;
    }
    if (Math.random() < 0.6) {
        gameState.controlledCities[cityName] = true;
        setAssistantMessage(`Sukses! Kota ${cityName} berhasil direbut.`);
        logMessage(`Berhasil merebut wilayah ${cityName}!`, 'success');
    } else {
        removeRandomMembers(1, 2);
        setAssistantMessage(`Gagal menyerang ${cityName}. Pasukan terpukul mundur.`);
        logMessage(`Gagal menyerang ${cityName}.`, 'danger');
    }
    updateUI();
};

// SERANGAN SANGAT BERDAMPAK KE DUA PEMAIN (Revisi #2)
window.attackPlayerCity = async function(cityName) {
    const occupant = globalOccupiedMap[cityName];
    if (!occupant) return;

    const myPwr = getPlayerTotalPower();
    
    // Ambil data real-time pemain target dari Cloud Firestore
    const targetCloudData = await loadUserDataFromCloud(occupant.uid);
    let targetPwr = 200; // Default jika target belum ter-update
    if (targetCloudData) {
        targetPwr = (targetCloudData.weapons || 0) * 25;
        (targetCloudData.members || []).forEach(m => targetPwr += m.power);
    }

    // Cek Peace Shield target
    if (targetCloudData && targetCloudData.peaceShieldUntil && Date.now() < targetCloudData.peaceShieldUntil) {
        alert(`Kota ${cityName} sedang dilindungi Peace Shield (Perlindungan Korban)! Tidak bisa diserang.`);
        return;
    }

    if (myPwr > targetPwr) {
        // 1. DAMPAK BAGI PENYERANG (Pemain A)
        gameState.controlledCities[cityName] = true;
        
        // Menjarah kas lawan (10% dari kas target, maks Rp 50 Juta)
        let lootedCash = 15000000;
        if (targetCloudData && targetCloudData.money) {
            lootedCash = Math.min(50000000, Math.floor(targetCloudData.money * 0.10));
        }
        gameState.money += lootedCash;

        // Update klaim kepemilikan kota di Database Global Firestore
        await updateCityOccupantGlobal(cityName, currentUser.uid, gameState.username);

        // 2. DAMPAK BAGI KORBAN (Pemain B)
        if (targetCloudData) {
            delete targetCloudData.controlledCities[cityName]; // Kota lepas dari Pemain B
            targetCloudData.money = Math.max(0, targetCloudData.money - lootedCash); // Kas Pemain B terpotong
            targetCloudData.peaceShieldUntil = Date.now() + (12 * 60 * 60 * 1000); // Beri Peace Shield 12 jam
            
            // Simpan perubahan langsung ke Firestore Pemain B
            await saveUserDataToCloud(occupant.uid, targetCloudData);
        }

        setAssistantMessage(`PERANG MENANG! Anda merebut ${cityName} dari ${occupant.username} & menjarah kas Rp ${lootedCash.toLocaleString('id-ID')}!`);
        logMessage(`KEMENANGAN PVP: Merebut ${cityName} dari ${occupant.username} (+Rp ${lootedCash.toLocaleString('id-ID')})`, 'success');
        
        await cloudAutosaveInterval();
        populateProvinceViewSelect();
        updateUI();
    } else {
        removeRandomMembers(1, 3);
        setAssistantMessage(`Serangan ke wilayah ${occupant.username} GAGAL! Pasukan kita dipukul mundur.`);
        logMessage(`PVP GAGAL: Serangan ke ${occupant.username} dipukul mundur. Pasukan gugur.`, 'danger');
        updateUI();
    }
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
                const earned = Math.floor(Math.random() * (c.maxReward - c.minReward + 1)) + c.minReward;
                gameState.money += earned;
                gameState.heat = Math.min(100, gameState.heat + heatInc);
                setAssistantMessage(`Aksi '${c.name}' sukses! Mendapatkan Rp ${earned.toLocaleString('id-ID')}.`);
                logMessage(`Aksi '${c.name}' sukses! (+Rp ${earned.toLocaleString('id-ID')})`, 'success');

                if (gameState.heat >= 100) triggerPlayerJail();
            } else {
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

// PERWIRA UNIK
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
        gameState.money -= o.cost;
        gameState.officers[oId] = true;
        setAssistantMessage(`Perwira '${o.name}' bergabung.`);
        logMessage(`Merekrut Perwira: ${o.name}`, 'success');
        renderOfficers();
        renderCrimes();
        updateUI();
    } else alert("Uang kas tidak cukup!");
};

// PENJARA
function triggerPlayerJail() {
    gameState.isJailed = true;
    gameState.jailTimerSec = Math.floor(Math.random() * 40) + 20;
    document.getElementById('jail-modal').classList.remove('hidden');
    setAssistantMessage("Anda ditangkap Polda!");
}

function jailTicker() {
    if (gameState.isJailed) {
        gameState.jailTimerSec--;
        document.getElementById('jail-timer-count').innerText = gameState.jailTimerSec;
        if (gameState.jailTimerSec <= 0) {
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
    if (gameState.money >= 50000000) {
        gameState.money -= 50000000;
        gameState.isJailed = false;
        gameState.heat = 0;
        document.getElementById('jail-modal').classList.add('hidden');
        logMessage("Suap bebas instan.", 'success');
        updateUI();
    } else alert("Uang tidak cukup!");
};

window.jailLawyer = function() {
    if (gameState.money >= 15000000) {
        gameState.money -= 15000000;
        if (Math.random() < 0.45) {
            gameState.isJailed = false;
            gameState.heat = 20;
            document.getElementById('jail-modal').classList.add('hidden');
            logMessage("Pengacara memenangkan gugatan.", 'success');
        } else {
            gameState.jailTimerSec = Math.max(5, gameState.jailTimerSec - 15);
            alert("Hukuman dipotong 15 detik.");
        }
        updateUI();
    } else alert("Uang tidak cukup!");
};

window.jailBreakout = function() {
    if (gameState.money >= 5000000) {
        gameState.money -= 5000000;
        if (Math.random() < 0.3) {
            gameState.isJailed = false;
            gameState.heat = 50;
            document.getElementById('jail-modal').classList.add('hidden');
            logMessage("Serbuan penjara berhasil!", 'success');
        } else {
            alert("Gagal! Waktu bertambah 15 detik.");
            gameState.jailTimerSec += 15;
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
            if (Math.random() > expType.risk) {
                gameState.money += expType.reward;
                setAssistantMessage(`Ekspedisi sukses! +Rp ${expType.reward.toLocaleString('id-ID')}`);
                logMessage(`Ekspedisi '${expType.name}' sukses! (+Rp ${expType.reward.toLocaleString('id-ID')})`, 'success');
            } else {
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
    gameState.controlledGlobal[gId] = true;
    logMessage(`BERHASIL MENAKLUKKAN KARTEL INTERNASIONAL: ${g.name}!`, 'success');
    renderGlobalTargets();
    updateUI();
};

// DONASI ORMAS & SUAP
window.donateOrmas = function() {
    if (gameState.money >= 15000000) {
        gameState.money -= 15000000;
        gameState.heat = Math.max(0, gameState.heat - 15);
        logMessage("Bakti sosial sukses. Heat -15%.", 'success');
        updateUI();
    } else alert("Uang tidak cukup!");
};

window.bribePolice = function() {
    if (gameState.money >= 40000000) {
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
        logMessage(`[TIMEOUT] Waktu habis! Sistem otomatis memilih: '${defaultChoice.text}'`, 'danger');
        handleEventAction(defaultChoice.act, defaultChoice.text);
    }
}

function handleEventAction(act, choiceText = '') {
    document.getElementById('event-modal').classList.add('hidden');
    currentActiveEvent = null;

    switch(act) {
        case 'fight_rival':
            if (getPlayerTotalPower() >= 150) logMessage("Berhasil memukul mundur geng rival!", 'success');
            else { gameState.money = Math.max(0, gameState.money - 15000000); logMessage("Kekuatan kurang! Bisnis dirusak, rugi Rp 15 Juta.", 'danger'); }
            break;
        case 'pay_peace':
            gameState.money = Math.max(0, gameState.money - 10000000);
            logMessage("Membayar Rp 10 Juta untuk uang damai.", 'danger');
            break;
        case 'close_business':
            gameState.isBusinessClosedTimer = 120;
            logMessage("Bisnis ditutup sementara selama 2 menit. Layar dikunci dari aktivitas!", 'danger');
            break;
        case 'ignore_heat':
            gameState.heat = Math.min(100, gameState.heat + 15);
            logMessage("Menghiraukan sidak polisi. Heat +15%.", 'danger');
            break;
        case 'sabotage_fix':
            gameState.money = Math.max(0, gameState.money - 15000000);
            logMessage("Memperbaiki bisnis yang disabotase (Rp 15 Juta).", 'success');
            break;
        case 'sabotage_destroy':
            const bizKeys = Object.keys(gameState.businesses).filter(k => gameState.businesses[k] > 0);
            if (bizKeys.length > 0) {
                const targetBiz = bizKeys[0];
                gameState.businesses[targetBiz]--;
                logMessage(`Bisnis '${targetBiz}' hancur disabotase mafia AI!`, 'danger');
            } else {
                gameState.money = Math.max(0, gameState.money - 10000000);
                logMessage("Tidak memiliki bisnis! Sabotase AI memotong kas sebesar Rp 10 Juta.", 'danger');
            }
            break;
        case 'buy_blackmarket':
            if (gameState.money >= 20000000) {
                gameState.money -= 20000000;
                gameState.weapons += 2;
                logMessage("Membeli pasokan senjata gelap borongan (+50 PWR).", 'success');
            } else {
                alert("Uang kas tidak cukup (butuh Rp 20 Juta)! Transaksi senjata dibatalkan.");
                logMessage("Gagal membeli senjata gelap karena kas kurang.", 'danger');
            }
            break;
        case 'ott_destroy':
            if (gameState.money >= 10000000) gameState.money -= 10000000;
            gameState.heat = Math.max(0, gameState.heat - 20);
            logMessage("Dokumen rahasia berhasil dimusnahkan. Biaya kurir Rp 10 Juta, Heat -20%.", 'success');
            break;
        case 'ott_bribe':
            if (gameState.money >= 50000000) {
                gameState.money -= 50000000;
                if (Math.random() > 0.25) {
                    gameState.heat = 0;
                    logMessage("Penyidik KPK berhasil disogok Rp 50 Juta! Heat bersih 0%.", 'success');
                } else {
                    alert("Sogokan ditolak penyidik jujur! Waktu penjara bertambah!");
                    triggerPlayerJail();
                }
            } else alert("Uang kas tidak cukup untuk menyogok penyidik KPK!");
            break;
        default:
            gameState.money += 10000000;
            break;
    }
    updateUI();
}

// PANDUAN MODAL
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
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return hash;
}

function logMessage(msg, type = '') {
    const logs = document.getElementById('game-logs');
    if (!logs) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logs.appendChild(entry);
    logs.scrollTop = logs.scrollHeight;
}

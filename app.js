import { auth, db, fetchGlobalOccupiedCities, claimBasecampGlobal, loadUserDataFromCloud, saveUserDataToCloud } from "./firebase-db.js";
import { PROVINCES, GLOBAL_TARGETS, RIVAL_NAMES, CRIMES_DATA, BUSINESS_DATA, ALL_EXPEDITION_MASTER, OFFICERS_MASTER, EVENTS_MASTER } from "./config.js";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

function createDefaultGameState() {
    return {
        setupDone: false,
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
        peaceShieldUntil: 0, // Proteksi Peace Shield (timestamp)
        isBusinessClosedTimer: 0 // Durasi tutup bisnis sementara sidak polisi
    };
}

let currentUser = null;
let currentAuthMode = 'login';
let gameState = createDefaultGameState();
let payoutCountdownSec = 60;
let currentActiveEvent = null;
let eventTimerSec = 20;
let globalOccupiedMap = {};

window.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    populateSetupSelects();

    setInterval(secondTicker, 1000);
    setInterval(cloudAutosaveInterval, 15000);
    rotateExpeditionMissions();
    setInterval(rotateExpeditionMissions, 45000);
    scheduleNextRandomEvent();
});

function setupAuthListeners() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            gameState = createDefaultGameState();
            globalOccupiedMap = await fetchGlobalOccupiedCities();

            document.getElementById('auth-modal').classList.add('hidden');
            const cloudData = await loadUserDataFromCloud(user.uid);
            if (cloudData) gameState = { ...createDefaultGameState(), ...cloudData };

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
    document.getElementById('auth-submit-btn').innerText = mode === 'login' ? 'MASUK' : 'DAFTAR';
};

window.handleAuthSubmit = async function(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const errorEl = document.getElementById('auth-error');
    errorEl.innerText = "";
    const email = `${username.toLowerCase()}@mafia.mmo`;

    try {
        if (currentAuthMode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            await cloudAutosaveInterval();
        }
    } catch (err) {
        errorEl.innerText = "Error: " + err.message;
    }
};

window.logout = function() { signOut(auth); };

// SETUP AWAL DENGAN CEK GLOBAL CLAIM
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
    const username = currentUser.email.split('@')[0];

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

    // Handle Bisnis Tutup Sementara (Sidak Polisi)
    if (gameState.isBusinessClosedTimer > 0) {
        gameState.isBusinessClosedTimer--;
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
    if (gameState.isBusinessClosedTimer > 0) return 0; // Tidak ada pemasukan saat bisnis ditutup sementara
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
    const net = income - expenses;

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
};

// PETA WILAYAH & PVP MMO ATTACK
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
              occupant && occupant.uid !== currentUser.uid ? `<button class="btn btn-red btn-xs" style="margin-top:10px; width:100%;" onclick="attackPlayerCity('${cityName}')">Serang Pemain Lain</button>` :
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

// Fitur Serang Pemain Lain (MMO Asynchronous Battle)
window.attackPlayerCity = async function(cityName) {
    const occupant = globalOccupiedMap[cityName];
    if (!occupant) return;

    const myPwr = getPlayerTotalPower();
    // Simulasi power target berdasarkan total power rata-rata (default 200 PWR)
    const targetPwr = 200; 

    if (myPwr >= targetPwr) {
        gameState.controlledCities[cityName] = true;
        setAssistantMessage(`Perang Berhasil! Anda merebut kota ${cityName} dari tangan ${occupant.username}!`);
        logMessage(`Berhasil merebut kota ${cityName} dari ${occupant.username}!`, 'success');
        updateUI();
    } else {
        removeRandomMembers(1, 3);
        setAssistantMessage(`Serangan ke wilayah ${occupant.username} gagal! Pertahanan mereka terlalu kuat.`);
        logMessage(`Gagal menyerang wilayah ${occupant.username}.`, 'danger');
    }
};

// AKSI KRIMINAL DENGAN RANGE REWARD & KRIMINAL SPESIAL (Revisi #2)
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
                // Hitung reward acak dalam rentang range (Revisi #2)
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

// PENJARA & BANTUAN TAHANAN (Revisi Bug #1)
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
            document.getElementById('jail-modal'].classList.add('hidden');
            logMessage("Serbuan penjara berhasil!", 'success');
        } else {
            alert("Gagal! Waktu bertambah 15 detik.");
            gameState.jailTimerSec += 15;
            removeRandomMembers(1, 2);
        }
        updateUI();
    } else alert("Uang tidak cukup!");
};

// Perbaikan Bug #1: Tampilan Tahanan & Tombol Bebaskan di Asisten
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
        div.innerHTML = `PWR ${m.power} (${m.timerSec}s) <button class="btn-xs btn-gold" onclick="bribeFreeJailedMember(${m.id})">Suap (Rp 10Jt)</button>`;
        container.appendChild(div);
    });
}

window.bribeFreeJailedMember = function(mId) {
    if (gameState.money >= 10000000) {
        gameState.money -= 10000000;
        const m = gameState.jailedMembers.find(x => x.id === mId);
        if (m) {
            gameState.members.push({ id: m.id, power: m.power });
            gameState.jailedMembers = gameState.jailedMembers.filter(x => x.id !== mId);
            logMessage("Anak buah dibebaskan dari sel.", 'success');
            updateUI();
        }
    } else alert("Uang tidak cukup!");
};

// EKSPEDISI (MAKS 2X SEHARI, RESET 00:00 WIB - Revisi #4)
function rotateExpeditionMissions() {
    const todayStr = new Date().toDateString();
    if (gameState.lastExpeditionDate !== todayStr) {
        gameState.expeditionCountToday = 0;
        gameState.lastExpeditionDate = todayStr;
    }

    const now = Date.now();
    gameState.availableExpeditions = (gameState.availableExpeditions || []).filter(ae => now < ae.expireTime);

    if (gameState.availableExpeditions.length < 2) {
        const randExp = ALL_EXPEDITION_MASTER[Math.floor(Math.random() * ALL_EXPEDITION_MASTER.length)];
        const expireTime = now + 40000;
        if (!gameState.availableExpeditions.some(ae => ae.expId === randExp.id)) {
            gameState.availableExpeditions.push({ id: Date.now(), expId: randExp.id, expireTime });
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
    if (limitInfo) limitInfo.innerText = `Sisa Kuota Ekspedisi Hari Ini: ${remaining} / 2 kali`;

    const hasActive = gameState.activeExpedition !== null;
    const limitReached = gameState.expeditionCountToday >= 2;

    gameState.availableExpeditions.forEach(ae => {
        const expType = ALL_EXPEDITION_MASTER.find(x => x.id === ae.expId);
        if (!expType) return;

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div>
                <h4>${expType.name}</h4>
                <p>Durasi: ${expType.durationSec}s | Hasil: Rp ${expType.reward.toLocaleString('id-ID')}</p>
            </div>
            <button class="btn btn-gold" ${hasActive || limitReached ? 'disabled' : ''} onclick="startExpedition('${ae.id}')">
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
                logMessage(`Ekspedisi sukses!`, 'success');
            } else {
                removeRandomMembers(1, 2);
                setAssistantMessage(`Ekspedisi gagal disadap aparat! Pasukan gugur.`);
                logMessage(`Ekspedisi gagal.`, 'danger');
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
        container.innerHTML = '<p class="text-muted">Tidak ada ekspedisi.</p>';
        return;
    }
    const sisaSec = Math.max(0, Math.ceil((gameState.activeExpedition.endTime - Date.now()) / 1000));
    container.innerHTML = `<div class="game-card"><h4>Ekspedisi Berjalan</h4><p>Sisa Waktu: <strong class="text-yellow">${sisaSec}s</strong></p></div>`;
}

// EKSPANSI INTERNASIONAL
function renderGlobalTargets() {
    const container = document.getElementById('global-targets-list');
    if (!container) return;
    container.innerHTML = '';

    GLOBAL_TARGETS.forEach(g => {
        const isControlled = gameState.controlledGlobal[g.id];
        const card = document.createElement('div');
        card.className = `game-card ${isControlled ? 'controlled-player' : ''}`;
        card.innerHTML = `
            <div>
                <h4>${g.name}</h4>
                <p>Syarat: Min ${g.reqPower} PWR</p>
            </div>
            ${isControlled ? '<span class="text-green">✔ Dikuasai</span>' : `<button class="btn btn-red" onclick="conquerGlobal('${g.id}')">Taklukkan</button>`}
        `;
        container.appendChild(card);
    });
}

window.conquerGlobal = function(gId) {
    const g = GLOBAL_TARGETS.find(x => x.id === gId);
    if (getPlayerTotalPower() < g.reqPower) {
        alert("Power tidak cukup!");
        return;
    }
    gameState.controlledGlobal[gId] = true;
    logMessage(`Berhasil menaklukkan ${g.name}!`, 'success');
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

// EVENT ACAK DENGAN 10 JENIS & BLOKIR LAYAR SIDAK POLISI (Revisi #3, #6, #7)
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
        btn.onclick = () => handleEventAction(c.act);
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
        handleEventAction(currentActiveEvent.choices[0].act);
        logMessage("Waktu event habis, sistem memilih opsi pertama.", 'danger');
    }
}

function handleEventAction(act) {
    document.getElementById('event-modal').classList.add('hidden');
    currentActiveEvent = null;

    switch(act) {
        case 'fight_rival':
            if (getPlayerTotalPower() >= 150) logMessage("Berhasil memukul mundur rival!", 'success');
            else { gameState.money = Math.max(0, gameState.money - 15000000); logMessage("Kekuatan kurang, rugi Rp 15 Juta.", 'danger'); }
            break;
        case 'pay_peace':
            gameState.money = Math.max(0, gameState.money - 10000000);
            break;
        case 'close_business':
            // Revisi #7: Tutup Bisnis Sementara, layar terkunci tidak bisa diklik (disimulasikan dengan timer state)
            gameState.isBusinessClosedTimer = 120; // 2 menit
            logMessage("Bisnis ditutup sementara untuk menghindari razia. Layar dikunci!", 'danger');
            alert("Operasi bisnis ditutup sementara selama 2 menit untuk menghindari razia kepolisian!");
            break;
        case 'ignore_heat':
            gameState.heat = Math.min(100, gameState.heat + 15);
            break;
        case 'sabotage_fix':
            gameState.money = Math.max(0, gameState.money - 15000000);
            logMessage("Bisnis yang disabotase AI berhasil diperbaiki.", 'success');
            break;
        case 'sabotage_destroy':
            // Revisi #3: Kemungkinan bisnis hancur disabotase AI
            const bizKeys = Object.keys(gameState.businesses);
            if (bizKeys.length > 0) {
                const targetBiz = bizKeys[0];
                gameState.businesses[targetBiz] = Math.max(0, gameState.businesses[targetBiz] - 1);
                logMessage(`Satu unit bisnis ${targetBiz} hancur akibat sabotase mafia AI!`, 'danger');
            }
            break;
        default:
            gameState.money += 10000000;
            break;
    }
    updateUI();
}

// PANDUAN MODAL (Revisi #8)
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
}

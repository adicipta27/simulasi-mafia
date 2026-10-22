export const PROVINCES = [
    { id: 'dki', name: 'DKI Jakarta', minPower: 0, cities: ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Utara', 'Jakarta Timur'] },
    { id: 'jabar', name: 'Jawa Barat', minPower: 150, cities: ['Bandung', 'Bekasi', 'Depok', 'Bogor', 'Cirebon', 'Sukabumi'] },
    { id: 'jateng', name: 'Jawa Tengah', minPower: 450, cities: ['Semarang', 'Solo', 'Magelang', 'Tegal', 'Pekalongan', 'Cilacap'] },
    { id: 'jatim', name: 'Jawa Timur', minPower: 900, cities: ['Surabaya', 'Malang', 'Kediri', 'Madiun', 'Banyuwangi', 'Probolinggo'] },
    { id: 'sumut', name: 'Sumatera Utara', minPower: 1800, cities: ['Medan', 'Pematangsiantar', 'Binjai', 'Tanjungbalai', 'Tebing Tinggi'] },
    { id: 'sulsel', name: 'Sulawesi Selatan', minPower: 3000, cities: ['Makassar', 'Palopo', 'Parepare', 'Toraja', 'Bone'] }
];

export const GLOBAL_TARGETS = [
    { id: 'golden_triangle', name: 'Segitiga Emas Asia Tenggara', reqPower: 5000, rewardPerMin: 50000000 },
    { id: 'hongkong_triad', name: 'Pelabuhan Hong Kong', reqPower: 10000, rewardPerMin: 150000000 },
    { id: 'sydney_underworld', name: 'Jaringan Sydney - Australia', reqPower: 25000, rewardPerMin: 500000000 }
];

export const RIVAL_NAMES = ['Geng Banteng Merah', 'Kartel Batavia', 'Ormas Pesisir', 'Mafia Port', 'Sindikat Hitam', 'Geng Kampung Atas'];

// KRIMINAL UMUM & SPESIAL DENGAN RANGE HASIL (Revisi #2)
export const CRIMES_DATA = [
    { id: 'parkir_liar', type: 'umum', name: 'Pungli Parkir Liar', durationSec: 5, minMembers: 1, minPower: 0, minReward: 300000, maxReward: 700000, heat: 2 },
    { id: 'peras_pasar', type: 'umum', name: 'Peras Pedagang Pasar', durationSec: 10, minMembers: 2, minPower: 20, minReward: 1200000, maxReward: 2500000, heat: 5 },
    { id: 'begal', type: 'umum', name: 'Begal Motor Malam', durationSec: 15, minMembers: 3, minPower: 50, minReward: 4000000, maxReward: 8000000, heat: 8 },
    
    // Spesial (Membutuhkan Perwira Unik)
    { id: 'pencucian_offshore', type: 'spesial', reqOfficer: 'bambang_lintah', name: 'Pencucian Dana Offshore', durationSec: 25, minMembers: 5, minPower: 120, minReward: 15000000, maxReward: 25000000, heat: 12 },
    { id: 'suap_tender', type: 'spesial', reqOfficer: 'akbp_hendro', name: 'Penggelapan Tender Proyek Negara', durationSec: 40, minMembers: 8, minPower: 300, minReward: 50000000, maxReward: 80000000, heat: 18 },
    { id: 'sindikat_internasional', type: 'spesial', reqOfficer: 'siti_mawar', name: 'Sindikat Penyelundupan Senjata Gelap', durationSec: 60, minMembers: 12, minPower: 600, minReward: 140000000, maxReward: 220000000, heat: 25 }
];

export const BUSINESS_DATA = [
    { id: 'warung_remang', name: 'Warung Remang-Remang', cost: 10000000, income: 300000 },
    { id: 'gelanggang_ayam', name: 'Arena Judi Sabung Ayam', cost: 45000000, income: 1500000 },
    { id: 'bengkel_pretelan', name: 'Bengkel Motor Pretelan', cost: 180000000, income: 6000000 },
    { id: 'club_malam', name: 'Diskotek & Bar Malam', cost: 750000000, income: 25000000 },
    { id: 'kasino_gelap', name: 'Kasino Gelap Bawah Tanah', cost: 3000000000, income: 100000000 }
];

export const ALL_EXPEDITION_MASTER = [
    { id: 'exp_1', name: 'Penyelundupan Ro-Ro Merak', durationSec: 45, reward: 50000000, risk: 0.3, penaltyMoney: 15000000 },
    { id: 'exp_2', name: 'Kargo Kayu Ilegal Kalimantan', durationSec: 60, reward: 90000000, risk: 0.35, penaltyMoney: 25000000 },
    { id: 'exp_3', name: 'Penyelundupan Rokok Tanpa Cukai', durationSec: 75, reward: 130000000, risk: 0.4, penaltyMoney: 40000000 },
    { id: 'exp_4', name: 'Lalu Lintas Jalur Tikus Entikong', durationSec: 90, reward: 180000000, risk: 0.45, penaltyMoney: 55000000 },
    { id: 'exp_5', name: 'Kapal Feri Gelap Jawa-Sumatera', durationSec: 120, reward: 260000000, risk: 0.5, penaltyMoney: 80000000 },
    { id: 'exp_6', name: 'Kontainer Elektronik Tanjung Priok', durationSec: 150, reward: 350000000, risk: 0.52, penaltyMoney: 110000000 },
    { id: 'exp_7', name: 'Armada Minyak Mentah Pesisir', durationSec: 180, reward: 500000000, risk: 0.55, penaltyMoney: 150000000 },
    { id: 'exp_8', name: 'Penyelundupan Biji Nikel Gelap', durationSec: 240, reward: 750000000, risk: 0.6, penaltyMoney: 220000000 },
    { id: 'exp_9', name: 'Kapal Isap Timah Ilegal Bangka', durationSec: 300, reward: 1100000000, risk: 0.65, penaltyMoney: 350000000 },
    { id: 'exp_10', name: 'Kontainer Laut Lintas Sula', durationSec: 360, reward: 1800000000, risk: 0.7, penaltyMoney: 500000000 }
];

export const OFFICERS_MASTER = [
    { id: 'bambang_lintah', name: 'Bambang Lintah', title: 'Ahli Finansial', cost: 25000000, desc: 'Potong gaji pasukan 20% & buka Kriminal Spesial Offshore.' },
    { id: 'akbp_hendro', name: 'AKBP Hendro (Korup)', title: 'Jalur Hukum', cost: 75000000, desc: 'Reduksi Heat aksi 30% & buka Kriminal Spesial Tender.' },
    { id: 'siti_mawar', name: 'Siti Mawar', title: 'Penyelundup Handal', cost: 150000000, desc: 'Risiko ekspedisi turun 15% & buka Kriminal Spesial Senjata.' }
];

// 10 JENIS EVENT ACAK LENGKAP (Revisi #6)
export const EVENTS_MASTER = [
    { id: 'ev_1', title: "SERANGAN GENG RIVAL", desc: "Geng musuh menyerang markas Anda!", choices: [{ text: "Lawan (Min 150 PWR)", act: 'fight_rival' }, { text: "Bayar Damai (Rp 10 Juta)", act: 'pay_peace' }] },
    { id: 'ev_2', title: "SIDAK POLDA KETAT", desc: "Razia besar-besaran di wilayah operasi.", choices: [{ text: "Tutup Bisnis Sementara (Durasi 2m)", act: 'close_business' }, { text: "Abaikan (+15% Heat)", act: 'ignore_heat' }] },
    { id: 'ev_3', title: "SABOTASE BISNIS HARAM", desc: "Mafia AI menyabotase salah satu bisnis Anda!", choices: [{ text: "Perbaiki Kerusakan (Rp 15 Juta)", act: 'sabotage_fix' }, { text: "Biarkan Hancur", act: 'sabotage_destroy' }] },
    { id: 'ev_4', title: "PENGKHIANATAN ANAK BUAH", desc: "Informan membocorkan lokasi kas.", choices: [{ text: "Selesaikan Diam-Diam (Rp 8 Juta)", act: 'trait_pay' }, { text: "Kejar & Eksekusi", act: 'trait_kill' }] },
    { id: 'ev_5', title: "PEMERASAN WARTAWAN", desc: "Media mengancam ekspos kejahatan.", choices: [{ text: "Suap Wartawan (Rp 12 Juta)", act: 'media_bribe' }, { text: "Teror Balik (+20% Heat)", act: 'media_terror' }] },
    { id: 'ev_6', title: "PENYELUNDUPAN SENJATA GELAP", desc: "Kontak militer menawarkan senjata murah.", choices: [{ text: "Beli Borongan (+50 PWR, Rp 20 Juta)", act: 'buy_blackmarket' }, { text: "Tolak Tawaran", act: 'ignore' }] },
    { id: 'ev_7', title: "BAKTI SOSIAL DADAKAN", desc: "Warga demo menuntut sumbangan.", choices: [{ text: "Bagi Sembako (-10% Heat, Rp 10 Juta)", act: 'social_aid' }, { text: "Bubarkan Paksa", act: 'dispers_crowd' }] },
    { id: 'ev_8', title: "OPERASI TANGKAP TANGAN", desc: "KPK mengincar transaksi suap Anda.", choices: [{ text: "Musnahkan Dokumen (Rp 25 Juta)", act: 'destroy_docs' }, { text: "Sogok Penyidik (Rp 50 Juta)", act: 'bribe_kpk' }] },
    { id: 'ev_9', title: "PERGESERAN DAERAH KEKUASAAN", desc: "Ormas lokal mengajak bagi hasil wilayah.", choices: [{ text: "Terima Aliansi (+Rp 30 Juta)", act: 'alliance_yes' }, { text: "Tolak & Perangi", act: 'alliance_no' }] },
    { id: 'ev_10', title: "BOS BESAR KEMBALI", desc: "Mentor lama memberikan suntikan modal.", choices: [{ text: "Terima Modal (+Rp 100 Juta)", act: 'mentor_money' }, { text: "Tolak Bantuan", act: 'ignore' }] }
];

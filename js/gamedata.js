// js/gamedata.js
export const SKILL_TREE_DATA = {
    'Stamina': {
        5: { id: 'stamina-5', name: 'Second Wind', description: 'Once per day, when your Alignment is low, gain a small burst of Intention.', icon: 'wind' },
        10: { id: 'stamina-10', name: 'Iron Constitution', description: 'Reduces the negative effects of the Fatigued status.', icon: 'heart' }
    },
    'Discipline': {
        5: { id: 'discipline-5', name: 'Unwavering Will', description: '10% chance to automatically resist a negative Whisper.', icon: 'anchor' },
        10: { id: 'discipline-10', name: 'Focused Intent', description: 'Gain 5% more Intention from all sources.', icon: 'crosshair' }
    },
    'Knowledge': {
        5: { id: 'knowledge-5', name: 'Scholarly Insight', description: '5% chance to gain double XP from reading or learning actions.', icon: 'book-open' }
    },
    'Social': {
        5: { id: 'social-5', name: 'Empathetic Resonance', description: 'Gain a small Intention boost when connecting with others.', icon: 'users' }
    },
    'Focus': {
        5: { id: 'focus-5', name: 'Mindful Eye', description: 'Gain more Essence of Will from daily Rites.', icon: 'eye' }
    }
};

export const CODEX_DATA = {
    "Entitas Kosmik": [
        { 
            id: 'codex_forger', 
            title: 'The Destiny Forger', 
            content: [{ stage: 0, text: 'Anda adalah arsitek dari realitas ini, entitas yang menenun takdir melalui [[codex_scales|Neraca Nurani]]. Setiap pilihan hamba Anda adalah benang dalam tenunan agung yang Anda awasi.' }],
            unlockedByDefault: true 
        },
        { 
            id: 'codex_wanderer', 
            title: 'The Wanderer', 
            content: [{ stage: 0, text: 'Kau. Jiwa yang terpanggil setelah merasakan getaran potensi yang terkunci. Kau adalah seorang raja di kerajaan yang hancur, seorang bintang yang pecah. Perjalananmu di dunia ini bukanlah untuk kembali seperti sedia kala, tetapi untuk menjadi versi yang lebih agung dari apa yang pernah ada.' }],
            unlockedByDefault: true 
        }
    ],
    "Filosofi & Hukum Dunia": [
        { 
            id: 'codex_shattering', 
            title: 'The Great Shattering', 
            content: [
                { stage: 0, text: 'Dahulu kala, jiwamu adalah sebuah bintang. Sebuah "Titik Nol" menghancurkannya, memecahnya menjadi serpihan [[codex_echoes_nature|Gema (Echoes)]] yang kini membentuk penjaramu yang tak terlihat.' },
                { stage: 1, text: "UPDATE: Anda telah merasakan tajamnya sebuah Gema. Kini Anda mengerti bahwa luka ini nyata, namun seperti yang diajarkan dalam [[codex_kintsugi|Filosofi Kintsugi]], setiap luka adalah potensi kekuatan.", unlockCondition: { type: 'ENCOUNTER_WHISPER' } }
            ],
            firstReadReward: { type: 'XP', attribute: 'Knowledge', amount: 15 },
            unlockedByDefault: false
        },
        { 
            id: 'codex_kintsugi', 
            title: 'The Kintsugi Philosophy', 
            content: [{ stage: 0, text: 'Seni kuno memperbaiki tembikar yang pecah dengan pernis emas. Filosofi ini mengajarkan bahwa kehancuran bukanlah akhir. Setiap retakan yang diperbaiki dengan emas ([[codex_intention_nature|Niat]]) justru menambah keindahan dan kekuatan pada jiwa.' }],
            unlockedByDefault: true 
        }
    ],
    "Gema & Niat": [
        { 
            id: 'codex_scales', 
            title: 'The Scales of Conscience', 
            content: [{ stage: 0, text: 'Manifestasi dari perang batin setiap jiwa. Sisi "Echo" mewakili kekuatan kebiasaan lama dan reaksi impulsif. Sisi "Intention" mewakili kekuatan kehendak dan pilihan sadar.' }],
            unlockedByDefault: true 
        },
        {
            id: 'codex_echoes_nature',
            title: 'Hakikat Gema (Echoes)',
            content: [{ stage: 0, text: 'Gema bukanlah kejahatan. Ia adalah serpihan dari dirimu yang dulu, bayangan dari bintang yang telah hancur. Menaklukkan Gema bukan berarti menghancurkannya, tetapi memahaminya dan memilih untuk tidak lagi dikendalikan olehnya.' }],
            unlockedByDefault: false
        },
        {
            id: 'codex_intention_nature',
            title: 'Hakikat Niat (Intention)',
            content: [{ stage: 0, text: 'Niat adalah emas cair Kintsugi. Ia adalah setiap pilihan sadar yang kau ambil. Ia adalah kekuatan saat ini yang secara aktif menyatukan kembali serpihan-serpihan jiwamu.' }],
            unlockedByDefault: false
        }
    ]
};
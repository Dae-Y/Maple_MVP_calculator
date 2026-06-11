const BOSS_ICON_BASE = "assets/boss-income-calculator/boss-icons/";

const BOSS_DATA = [
  {
    id: "zaqqum",
    name: "자쿰",
    icon: "zaqqum.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지", price: 1000000 },
      { id: "normal", label: "노멀", price: 2000000 },
      { id: "chaos", label: "카오스", price: 10000000 }
    ]
  },
  {
    id: "magnus",
    name: "매그너스",
    icon: "magnus.png",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지", price: 1200000 },
      { id: "normal", label: "노멀", price: 3000000 },
      { id: "hard", label: "하드", price: 15000000 }
    ]
  },
  {
    id: "hilla",
    name: "힐라",
    icon: "hilla.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 1500000 },
      { id: "hard", label: "하드", price: 12000000 }
    ]
  },
  {
    id: "kaung",
    name: "카웅",
    icon: "kaung.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 2000000 }
    ]
  },
  {
    id: "papulatus",
    name: "파풀라투스",
    icon: "papulatus.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지", price: 1500000 },
      { id: "normal", label: "노멀", price: 4000000 },
      { id: "chaos", label: "카오스", price: 25000000 }
    ]
  },
  {
    id: "vonbon",
    name: "반반",
    icon: "vonbon.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 1500000 },
      { id: "chaos", label: "카오스", price: 15000000 }
    ]
  },
  {
    id: "pierre",
    name: "피에르",
    icon: "pierre.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 1500000 },
      { id: "chaos", label: "카오스", price: 15000000 }
    ]
  },
  {
    id: "bloodyqueen",
    name: "블러디 퀸",
    icon: "bloodyqueen.webp",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 1500000 },
      { id: "chaos", label: "카오스", price: 15000000 }
    ]
  },
  {
    id: "vellum",
    name: "벨룸",
    icon: "vellum.webp",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 2000000 },
      { id: "chaos", label: "카오스", price: 20000000 }
    ]
  },
  {
    id: "vanleon",
    name: "반 레온",
    icon: "vanleon.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지", price: 1000000 },
      { id: "normal", label: "노멀", price: 2000000 },
      { id: "hard", label: "하드", price: 8000000 }
    ]
  },
  {
    id: "horntail",
    name: "혼테일",
    icon: "horntail.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지", price: 1000000 },
      { id: "normal", label: "노멀", price: 2000000 },
      { id: "chaos", label: "카오스", price: 5000000 }
    ]
  },
  {
    id: "arkarium",
    name: "아카이럼",
    icon: "arkarium.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지", price: 1200000 },
      { id: "normal", label: "노멀", price: 3000000 }
    ]
  },
  {
    id: "pinkbean",
    name: "핑크빈",
    icon: "pinkbean.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 2500000 },
      { id: "chaos", label: "카오스", price: 16000000 }
    ]
  },
  {
    id: "cygnus",
    name: "시그너스",
    icon: "cygnus.png",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지", price: 3000000 },
      { id: "normal", label: "노멀", price: 18000000 }
    ]
  },
  {
    id: "lotus",
    name: "스우",
    icon: "swoo.webp",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 30000000 },
      { id: "hard", label: "하드", price: 120000000 },
      { id: "extreme", label: "익스트림", price: 400000000 }
    ]
  },
  {
    id: "demian",
    name: "데미안",
    icon: "damien.webp",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 30000000 },
      { id: "hard", label: "하드", price: 110000000 }
    ]
  },
  {
    id: "guardian_angel_slime",
    name: "가디언 엔젤 슬라임",
    icon: "guardianslime.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀", price: 45000000 },
      { id: "chaos", label: "카오스", price: 250000000 }
    ]
  },
  {
    id: "lucid",
    name: "루시드",
    icon: "lucid.webp",
    forceType: "arcane",
    difficulties: [
      { id: "easy", label: "이지", price: 35000000 },
      { id: "normal", label: "노멀", price: 50000000 },
      { id: "hard", label: "하드", price: 200000000 }
    ]
  },
  {
    id: "will",
    name: "윌",
    icon: "will.webp",
    forceType: "arcane",
    difficulties: [
      { id: "easy", label: "이지", price: 38000000 },
      { id: "normal", label: "노멀", price: 55000000 },
      { id: "hard", label: "하드", price: 220000000 }
    ]
  },
  {
    id: "dusk",
    name: "더스크",
    icon: "dusk.webp",
    forceType: "arcane",
    difficulties: [
      { id: "normal", label: "노멀", price: 60000000 },
      { id: "chaos", label: "카오스", price: 260000000 }
    ]
  },
  {
    id: "jinhilla",
    name: "진 힐라",
    icon: "versushilla.webp",
    forceType: "arcane",
    difficulties: [
      { id: "normal", label: "노멀", price: 70000000 },
      { id: "hard", label: "하드", price: 300000000 }
    ]
  },
  {
    id: "dunkel",
    name: "듄켈",
    icon: "dunkel.png",
    forceType: "arcane",
    difficulties: [
      { id: "normal", label: "노멀", price: 75000000 },
      { id: "hard", label: "하드", price: 320000000 }
    ]
  },
  {
    id: "black_mage",
    name: "검은 마법사",
    icon: "blackmage.webp",
    forceType: "arcane",
    difficulties: [
      { id: "hard", label: "하드", price: 500000000 },
      { id: "extreme", label: "익스트림", price: 1500000000 }
    ]
  },
  {
    id: "seren",
    name: "선택받은 세렌",
    icon: "seren.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀", price: 350000000 },
      { id: "hard", label: "하드", price: 600000000 },
      { id: "extreme", label: "익스트림", price: 1800000000 }
    ]
  },
  {
    id: "kalos",
    name: "감시자 칼로스",
    icon: "kalos.png",
    forceType: "authentic",
    difficulties: [
      { id: "easy", label: "이지", price: 300000000 },
      { id: "normal", label: "노멀", price: 450000000 },
      { id: "chaos", label: "카오스", price: 800000000 },
      { id: "extreme", label: "익스트림", price: 2500000000 }
    ]
  },
  {
    id: "first_adversary",
    name: "최초의 대적자",
    icon: "firstadversary.webp",
    forceType: "authentic",
    difficulties: [
      { id: "easy", label: "이지", price: 320000000 },
      { id: "normal", label: "노멀", price: 480000000 },
      { id: "hard", label: "하드", price: 900000000 },
      { id: "extreme", label: "익스트림", price: 2800000000 }
    ]
  },
  {
    id: "kaling",
    name: "카링",
    icon: "kaling.webp",
    forceType: "authentic",
    difficulties: [
      { id: "easy", label: "이지", price: 350000000 },
      { id: "normal", label: "노멀", price: 520000000 },
      { id: "hard", label: "하드", price: 1000000000 },
      { id: "extreme", label: "익스트림", price: 3000000000 }
    ]
  },
  {
    id: "radiant_malefic_star",
    name: "찬란한 흉성",
    icon: "radiantmaleficstar.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀", price: 600000000 },
      { id: "hard", label: "하드", price: 1200000000 }
    ]
  },
  {
    id: "limbo",
    name: "림보",
    icon: "limbo.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀", price: 700000000 },
      { id: "hard", label: "하드", price: 1500000000 }
    ]
  },
  {
    id: "baldrix",
    name: "발드릭스",
    icon: "baldrix.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀", price: 800000000 },
      { id: "hard", label: "하드", price: 1800000000 }
    ]
  },
  {
    id: "jupiter",
    name: "유피테르",
    icon: "jupiter.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀", price: 900000000 },
      { id: "hard", label: "하드", price: 2000000000 }
    ]
  }
];

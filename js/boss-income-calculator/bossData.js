const BOSS_ICON_BASE = "assets/boss-income-calculator/boss-icons/";

const BOSS_DATA = [
  {
    id: "zaqqum",
    name: "자쿰",
    icon: "zaqqum.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "magnus",
    name: "매그너스",
    icon: "magnus.png",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "hilla",
    name: "힐라",
    icon: "hilla.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "kaung",
    name: "카웅",
    icon: "kaung.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" }
    ]
  },
  {
    id: "papulatus",
    name: "파풀라투스",
    icon: "papulatus.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "vonbon",
    name: "반반",
    icon: "vonbon.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "pierre",
    name: "피에르",
    icon: "pierre.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "bloodyqueen",
    name: "블러디 퀸",
    icon: "bloodyqueen.webp",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "vellum",
    name: "벨룸",
    icon: "vellum.webp",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "vanleon",
    name: "반 레온",
    icon: "vanleon.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "horntail",
    name: "혼테일",
    icon: "horntail.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "arkarium",
    name: "아카이럼",
    icon: "arkarium.webp",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" }
    ]
  },
  {
    id: "pinkbean",
    name: "핑크빈",
    icon: "pinkbean.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "cygnus",
    name: "시그너스",
    icon: "cygnus.png",
    forceType: null,
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" }
    ]
  },
  {
    id: "lotus",
    name: "스우",
    icon: "swoo.webp",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" },
      { id: "extreme", label: "익스트림" }
    ]
  },
  {
    id: "demian",
    name: "데미안",
    icon: "damien.webp",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "guardian_angel_slime",
    name: "가디언 엔젤 슬라임",
    icon: "guardianslime.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "lucid",
    name: "루시드",
    icon: "lucid.webp",
    forceType: "arcane",
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "will",
    name: "윌",
    icon: "will.webp",
    forceType: "arcane",
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "dusk",
    name: "더스크",
    icon: "dusk.webp",
    forceType: "arcane",
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" }
    ]
  },
  {
    id: "jinhilla",
    name: "진 힐라",
    icon: "versushilla.webp",
    forceType: "arcane",
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "dunkel",
    name: "듄켈",
    icon: "dunkel.png",
    forceType: "arcane",
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "black_mage",
    name: "검은 마법사",
    icon: "blackmage.webp",
    forceType: "arcane",
    difficulties: [
      { id: "hard", label: "하드" },
      { id: "extreme", label: "익스트림" }
    ]
  },
  {
    id: "seren",
    name: "선택받은 세렌",
    icon: "seren.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" },
      { id: "extreme", label: "익스트림" }
    ]
  },
  {
    id: "kalos",
    name: "감시자 칼로스",
    icon: "kalos.png",
    forceType: "authentic",
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "chaos", label: "카오스" },
      { id: "extreme", label: "익스트림" }
    ]
  },
  {
    id: "first_adversary",
    name: "최초의 대적자",
    icon: "firstadversary.webp",
    forceType: "authentic",
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" },
      { id: "extreme", label: "익스트림" }
    ]
  },
  {
    id: "kaling",
    name: "카링",
    icon: "kaling.webp",
    forceType: "authentic",
    difficulties: [
      { id: "easy", label: "이지" },
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" },
      { id: "extreme", label: "익스트림" }
    ]
  },
  {
    id: "radiant_malefic_star",
    name: "찬란한 흉성",
    icon: "radiantmaleficstar.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "limbo",
    name: "림보",
    icon: "limbo.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "baldrix",
    name: "발드릭스",
    icon: "baldrix.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "jupiter",
    name: "유피테르",
    icon: "jupiter.png",
    forceType: "authentic",
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ]
  },
  {
    id: "kai",
    name: "카이",
    icon: "kai.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" },
      { id: "hard", label: "하드" }
    ],
    seasonal: true
  },
  {
    id: "meilin",
    name: "메이린",
    icon: "meilin.png",
    forceType: null,
    difficulties: [
      { id: "normal", label: "노멀" }
    ],
    seasonal: true
  }
];

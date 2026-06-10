# maple_tools

메이플스토리 유저를 위한 정적 웹 도구함입니다.  
MVP작 계산, 메소마켓 루트 계산, 큐브 잠재능력 시뮬레이션을 HTML/CSS/JavaScript만으로 제공합니다.

- 배포: GitHub Pages
- 구조: 정적 HTML/CSS/JavaScript
- 로그인/서버/DB 없음
- 한국어 UI 중심
- 팬메이드 개인 프로젝트

AI-readable project summary: [`llms.txt`](./llms.txt)

---

## 배포 링크

- 메이플 도구함: https://dae-y.github.io/maple_tools/
- MVP작 계산기: https://dae-y.github.io/maple_tools/mvp-calculator.html
- 큐브 시뮬레이터: https://dae-y.github.io/maple_tools/cube-simulator.html
- 사냥 타이머: https://dae-y.github.io/maple_tools/hunting-timer.html
- 주간보스 수익 계산기: https://dae-y.github.io/maple_tools/boss-income-calculator.html

---

## 주요 기능

### 메이플 도구함

사용 가능한 도구를 모아둔 메인 페이지입니다.

- MVP작 계산기 이동
- 큐브 시뮬레이터 이동
- 도구 메뉴
- 문의 / 후원 메뉴
- 모바일 반응형 UI

### MVP작 계산기

캐시 아이템 가격, 마일리지, 물통비율을 입력해 목표 MVP 등급까지의 예상 손실과 구매 조합을 계산합니다.

주요 기능:

- 현재 MVP 등급 / 목표 등급 기준 계산
- 캐시 아이템 경매장 판매 루트 계산
- 마일리지 적용 여부 반영
- 메소마켓 루트 계산
- 이익 우선 / 시간 우선 전략 비교
- 입력값 저장 및 불러오기
- 커스텀 캐시 아이템 추가

### 큐브 시뮬레이터

메이플스토리 공식 확률표 데이터를 기반으로 장비 잠재능력 재설정 결과를 시뮬레이션합니다.

주요 기능:

- 윗잠 / 아랫잠 / 명큐·골큐 계열 선택
- 장비 레벨 및 장비 부위 선택
- 공식 확률표 기반 옵션 시뮬레이션
- 3회 재설정 후보 선택
- 자동 돌리기 목표 설정
- 줄별 정확한 목표 옵션 지정
- 공격력 / 마력 / 보공 / 드메 등 목표 분류 지정
- 상세 로그
- 리빙 포인트 확률 팁
- 모바일 반응형 UI

### 사냥 타이머

30분 사냥 타이머와 설치기 재설치 주기를 함께 관리하는 간단한 타이머입니다.

주요 기능:

- 30분 사냥/버프 세션 타이머 (10분 / 20분 / 30분 프리셋 제공)
- 반복되는 설치기/스킬 타이머 (60초 / 70초 / 80초 / 120초 프리셋 제공)
- 타이머 만료 시 Web Audio API를 이용한 알림음 재생 및 시각적 경고 출력
- 설치기 타이머 자동 재시작 기능
- 사냥 전 체크용 간단한 버프/소비 아이템 체크리스트 제공 (상태 자동 저장)
- 모바일 반응형 UI 지원

---

## 정보 페이지

사이트 운영과 검색엔진/광고 심사 대비를 위해 아래 정보 페이지를 포함합니다.

- 소개: `about.html`
- 문의: `contact.html`
- 개인정보처리방침: `privacy.html`
- 업데이트 내역: `updates.html`
- robots.txt: `robots.txt`
- sitemap.xml: `sitemap.xml`

---

## 프로젝트 구조

```text
maple_tools/
├── index.html
├── mvp-calculator.html
├── cube-simulator.html
├── hunting-timer.html
├── boss-income-calculator.html
├── about.html
├── contact.html
├── privacy.html
├── updates.html
├── robots.txt
├── sitemap.xml
├── llms.txt
├── assets/
│   ├── brand/
│   ├── favicon/
│   ├── fonts/
│   ├── mvp-calculator/
│   │   ├── items/
│   │   └── tiers/
│   ├── cube-simulator/
│   │   └── potential/
│   └── boss-income-calculator/
│       └── boss-icons/
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── mvp-calculator.css
│   ├── cube-simulator.css
│   ├── hunting-timer.css
│   ├── boss-income-calculator.css
│   ├── info-pages.css
│   ├── styles.css          # legacy fallback/importer
│   └── README.md
├── data/
│   └── cube-simulator/
│       ├── acprobs.json
│       ├── bcprobs.json
│       └── wcprobs.json
├── js/
│   ├── mvp-calculator/
│   │   ├── app.js
│   │   ├── cashItems.js
│   │   └── mesoMarket.js
│   ├── cube-simulator/
│   │   ├── autoRoll.js
│   │   ├── cubeData.js
│   │   ├── cubeGoals.js
│   │   ├── cubeRoller.js
│   │   ├── cubeSimulator.js
│   │   └── cubeTips.js
│   ├── hunting-timer/
│   │   └── app.js
│   └── boss-income-calculator/
│       ├── bossData.js
│       └── app.js
└── scripts/
    ├── crop-character-image.mjs
    └── update-cube-probabilities.mjs
```

---

## 로컬 실행

프로젝트 루트에서 간단한 로컬 서버를 실행합니다.

```bash
python3 -m http.server 8000
```

브라우저에서 아래 주소를 열면 됩니다.

```text
http://localhost:8000/
http://localhost:8000/mvp-calculator.html
http://localhost:8000/cube-simulator.html
http://localhost:8000/hunting-timer.html
http://localhost:8000/about.html
http://localhost:8000/privacy.html
http://localhost:8000/contact.html
http://localhost:8000/updates.html
```

---

## 큐브 확률 데이터 업데이트

큐브 시뮬레이터는 `data/cube-simulator/` 안의 정적 JSON 파일을 사용합니다.  
메이플스토리 공식 확률표 기준으로 데이터를 다시 가져오려면 아래 명령어를 실행합니다.

```bash
node scripts/update-cube-probabilities.mjs
```

이 스크립트는 공식 확률형 아이템 페이지에서 레전드리 잠재능력 확률표를 가져와 아래 파일들을 갱신합니다.

```text
data/cube-simulator/bcprobs.json
data/cube-simulator/wcprobs.json
data/cube-simulator/acprobs.json
```

웹페이지에서 넥슨 사이트를 직접 호출하지 않고, 로컬 개발 환경에서 JSON을 갱신한 뒤 정적 파일로 사용합니다.

---

## 캐릭터 이미지 크롭

메인 도구함에서 사용하는 캐릭터 이미지의 투명 여백을 줄이기 위한 보조 스크립트입니다.

```bash
node scripts/crop-character-image.mjs
```

입력:

```text
assets/brand/character.png
```

출력:

```text
assets/brand/character-cropped.png
```

---

## 개발 메모

이 프로젝트는 현재 정적 사이트 구조를 유지합니다.  
로그인, 서버 DB, 관리자 페이지, 유저별 저장 기능이 필요해지기 전까지는 GitHub Pages 배포로 충분합니다.

새 도구를 추가할 때는 보통 아래 파일을 수정합니다.

```text
index.html
css/ (modular CSS files)
새 도구 HTML 파일
새 도구 JS 폴더
```

도구 페이지를 추가하면 도구 메뉴와 `sitemap.xml`도 함께 갱신합니다.

---

## 참고 및 고지

이 프로젝트는 개인 제작 팬 도구입니다.  
넥슨에서 공식 지원하거나 운영하는 페이지가 아닙니다.

계산 결과와 시뮬레이션 결과는 참고용입니다.  
게임 정책, 수수료, 확률표, 시세, 아이템 구성은 변경될 수 있습니다.

큐브 확률 계산은 메이플스토리 공식 홈페이지의 확률표 데이터를 참고합니다.

MapleStory 및 관련 이름, 아이콘, 이미지, 게임 데이터의 권리는 Nexon에 있습니다.

---

## License

이 프로젝트의 소스코드와 자체 제작 구성은 All rights reserved입니다.  
사전 허가 없이 복사, 수정, 재배포, 상업적 이용, 별도 서비스 운영에 사용할 수 없습니다.

MapleStory 및 관련 아이콘, 이미지, 이름, 게임 데이터의 권리는 Nexon에 있습니다.

The source code and original project structure are All rights reserved.  
You may not copy, modify, redistribute, commercialize, or host this project as a separate service without prior permission.

MapleStory and related icons, images, names, and game data belong to Nexon.

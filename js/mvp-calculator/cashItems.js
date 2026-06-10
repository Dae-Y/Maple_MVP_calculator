/**
 * cashItem.js
 * Manages the list of available cash items for the calculator.
 * Only responsible for defining and maintaining item metadata.
 */

/*
  새 아이템 추가하려면 배열 안에 더 넣으면 됨.
  예시:
  {
    id: "new_item_1",
    name: "새 아이템 1개",
    cashPrice: 12300,
    icon: "fallback.png",
    mileageDiscount: false,
  }

  icon은 assets/mvp-calculator/items/ 안에 넣기.
  mileageDiscount: true  -> 마일리지 적용 품목
  mileageDiscount: false -> 마일리지 미적용 품목
*/

window.DEFAULT_CASH_ITEMS = [
  {
    id: "royal_1",
    name: "로얄 1개",
    cashPrice: 2200,
    icon: "royal.png",
    mileageDiscount: false,
  },
  {
    id: "royal_10",
    name: "로얄 10개",
    cashPrice: 22000,
    icon: "royal.png",
    mileageDiscount: false,
  },
  {
    id: "royal_20",
    name: "로얄 20개",
    cashPrice: 44000,
    icon: "royal.png",
    mileageDiscount: false,
  },

  /*
  {
    id: "royal_45",
    name: "로얄 45개",
    cashPrice: 99000,
    icon: "royal.png",
    mileageDiscount: false,
  },
  {
    id: "wonderberry_1",
    name: "원더베리 1개",
    cashPrice: 5400,
    icon: "wonderberry.webp",
    mileageDiscount: false,
  },
  */

  {
    id: "wonderberry_11",
    name: "원더베리 11개",
    cashPrice: 54000,
    icon: "wonderberry.webp",
    mileageDiscount: false,
  },

  /*
  {
    id: "boutique_1",
    name: "부티크 1개",
    cashPrice: 3300,
    icon: "boutique.png",
    mileageDiscount: false,
  },
  */

  {
    id: "boutique_10",
    name: "부티크 10개",
    cashPrice: 33000,
    icon: "boutique.png",
    mileageDiscount: false,
  },
  {
    id: "luna_crystal",
    name: "루나 크리스탈",
    cashPrice: 3900,
    icon: "luna_crystal.webp",
    mileageDiscount: false,
  },

  /*
  {
    id: "platinum_apple_1",
    name: "플래 애플 1개",
    cashPrice: 3500,
    icon: "plat_apple.png",
    mileageDiscount: false,
  },
  {
    id: "platinum_apple_33",
    name: "플래 애플 33개",
    cashPrice: 99000,
    icon: "plat_apple.png",
    mileageDiscount: false,
  },
  */

  {
    id: "freestyle_1",
    name: "프리스타일",
    cashPrice: 5500,
    icon: "freestyle.png",
    mileageDiscount: false,
  },

  {
    id: "option_scroll_1",
    name: "추옵 스크롤",
    cashPrice: 49000,
    icon: "option_scroll.png",
    mileageDiscount: false,
  },

  {
    id: "jin_package_1",
    name: "진 패키지 합",
    cashPrice: 69800,
    icon: "fallback.png",
    mileageDiscount: false,
  },



  /* 마일리지 적용 품목 */


  {
    id: "scissors",
    name: "플래티넘 가위",
    cashPrice: 5900,
    icon: "scissors.png",
    mileageDiscount: true,
  },

  {
    id: "premium_hair",
    name: "프리미엄 헤쿠",
    cashPrice: 5500,
    icon: "premium_hair.png",
    mileageDiscount: true,
  },

  {
    id: "premium_face",
    name: "프리미엄 성쿠",
    cashPrice: 3500,
    icon: "premium_face.png",
    mileageDiscount: true,
  },

  {
    id: "mvp_super",
    name: "MVP 슈퍼파워",
    cashPrice: 3000,
    icon: "mvp_super.png",
    mileageDiscount: true,
  },

  {
    id: "ubbu",
    name: "마슈르 기상효과",
    cashPrice: 3000,
    icon: "ubbu.png",
    mileageDiscount: true,
  },


  /*
  {
    id: "black_hair",
    name: "흑발 헤쿠",
    cashPrice: 20000,
    icon: "black_hair.png",
    mileageDiscount: true,
  },

  {
    id: "white_eye",
    name: "백안 성쿠",
    cashPrice: 15000,
    icon: "white_eye.png",
    mileageDiscount: true,
  },
  */



];
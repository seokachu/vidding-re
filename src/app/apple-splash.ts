/**
 * iOS 스플래시(스타트업 이미지) 목록.
 *
 * iOS 는 매니페스트의 스플래시를 읽지 않는다. 홈 화면에서 열 때
 * `apple-touch-startup-image` 링크와 **기기 해상도가 정확히 일치하는**
 * 이미지만 쓰고, 없으면 흰 화면이다. 그래서 기기마다 한 장씩 나열한다.
 *
 * 이미지는 `public/splash/` 에 있고 Expo 스플래시와 같은 모양(흰 배경 +
 * 중앙 로고)이다. 새 기기 해상도가 나오면 여기와 생성 스크립트에 한 줄씩
 * 늘리면 된다. 가로 모드는 만들지 않는다 — 앱이 세로(390px) 기준이다.
 */

// [논리 폭(pt), 논리 높이(pt), 배율]
const SCREENS: ReadonlyArray<readonly [number, number, number]> = [
  [440, 956, 3], // iPhone 16 Pro Max
  [430, 932, 3], // 14/15 Pro Max, 15/16 Plus
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 6+/7+/8+ Plus
  [402, 874, 3], // iPhone 16 Pro
  [393, 852, 3], // 14 Pro, 15, 16
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, 12/13 mini
  [375, 667, 2], // 6/7/8, SE 2/3
  [1024, 1366, 2], // iPad Pro 12.9"
  [834, 1194, 2], // iPad Pro 11"
  [820, 1180, 2], // iPad Air 10.9"
  [834, 1112, 2], // iPad Pro 10.5"
  [810, 1080, 2], // iPad 10.2"
  [768, 1024, 2], // iPad 9.7", mini
];

export const appleStartupImages = SCREENS.map(([width, height, ratio]) => ({
  url: `/splash/apple-splash-${width * ratio}x${height * ratio}.png`,
  media:
    `(device-width: ${width}px) and (device-height: ${height}px) ` +
    `and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
}));

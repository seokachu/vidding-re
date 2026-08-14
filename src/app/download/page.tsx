import { ApkDownload } from "@/features/install/apk-download";

export const metadata = {
  title: "Vidding 앱 다운로드",
  description: "Android APK 를 내려받아 설치합니다.",
};

/**
 * APK 다운로드 (`/download`).
 *
 * README 의 QR 과 다운로드 링크가 여기를 가리킨다. 릴리스 파일을 직접
 * 가리키지 않는 이유와 인앱 브라우저 분기는 `ApkDownload` 주석 참고.
 */
export default function DownloadPage() {
  return <ApkDownload />;
}

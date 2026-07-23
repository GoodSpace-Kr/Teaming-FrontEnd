# 성능 개선 및 코드 정리 내역

이력서/포트폴리오 정리를 위해 이번 작업에서 수정한 내용과 측정값을 정리한 문서입니다.
측정은 모두 로컬(Windows, Chrome) 환경에서 `next build` / React Profiler로 진행했습니다.

---

## 1. 채팅 메시지 리스트 리렌더링 최적화 (핵심)

**증상**: 채팅방에서 메시지를 입력창에 타이핑하거나, 메시지 하나에 마우스를 올리기만 해도
화면에 그려진 메시지 전체(수십~수백 개)가 다시 렌더링됨.

**원인**

- `ChatMessage`에 `React.memo`가 없어 부모가 리렌더될 때마다 모든 메시지 컴포넌트가 무조건 재실행됨
- `ChatRoom`에서 `displayMessages`(메시지 배열)와 `chatUsers`(유저 배열)를 렌더마다 새 배열로 생성 →
  `React.memo`를 걸어도 props 참조가 매번 달라져 효과가 없는 구조였음
- `hoveredMessage` 상태를 상위(`ChatRoom`)에서 관리해, 메시지 하나에 마우스를 올리는 것만으로
  리스트 전체가 리렌더 대상이 됨
- 읽음 상태(`readBy`) 갱신을 `ChatRoom`의 별도 `setState`로 처리해 메시지 배열 전체를 매번 새로 매핑

**조치**

- `ChatMessage`를 `React.memo`로 래핑
- 더 이상 쓰이지 않는 `hoveredMessage`/읽음 툴팁 관련 코드(주석 처리된 죽은 코드 포함) 제거
- `displayMessages`를 `WeakMap` 캐시 기반 `useMemo`로 변환 — 변경되지 않은 메시지는 이전 렌더의
  객체 참조를 그대로 재사용하도록 함
- `chatUsers`를 `useMemo`로 안정화 (`members`가 실제로 바뀔 때만 새 배열 생성)
- 읽음 경계 갱신 로직을 `ChatRoom`의 `setState`에서 `useChatMessages` 훅의 `updateReadBoundary`로 이동해
  리렌더 경로를 하나로 통합

**측정 방법**: 실제 `ChatMessage`/`ChatRoom` 컴포넌트를 그대로 사용하는 벤치마크 페이지
(`/perftestbench`, 측정 후 삭제)를 만들어, 메시지 300개를 렌더링한 상태에서 부모 리렌더(예: 타이핑
1회에 해당하는 이벤트)를 30회 반복시키고 `React.Profiler`로 커밋 수/렌더 시간을 측정. (개선 전 구조는
`React.memo` 없이 + 매 렌더마다 메시지/유저 배열을 새로 생성하도록 재현.) Puppeteer로 브라우저를
직접 띄워 버튼을 클릭시키고 화면에 표시된 결과를 스크린샷으로 캡쳐.

**결과** (스크린샷: `perf-screenshots/02-legacy-result.png`, `03-modern-result.png`)

| 구분 | 커밋 수 | 총 렌더 시간 | 커밋당 평균 |
|---|---|---|---|
| 개선 전 | 30 | 564.10ms | 18.803ms |
| 개선 후 | 30 | 10.90ms | 0.363ms |

**→ 커밋당 평균 렌더 시간 약 52배 감소 (18.8ms → 0.36ms, -98%)**

(참고: 같은 벤치마크를 여러 번 돌려보면 로컬 머신 부하에 따라 개선 전 수치가 대략 19~27ms,
개선 후가 0.36~0.76ms 사이에서 흔들림 — 매 실행마다 30~50배 수준의 개선폭은 일관되게 재현됨.)

관련 파일: `src/app/(afterLogin)/mainpage/_component/chatmessage.tsx`,
`src/app/(afterLogin)/mainpage/_component/chatroom.tsx`

---

## 2. 프로덕션 빌드에서 console 로그 제거

**증상**: 코드베이스 전체에 `console.log`/`warn`/`error` 호출이 **491건** 존재. 특히
`actionbar.tsx`의 STOMP WebSocket 메시지 핸들러는 방 이벤트가 하나 올 때마다 전체 `rooms` 배열을
`map`으로 가공해 `console.log`로 출력 — 프로덕션 빌드에도 그대로 남아있어 실시간 이벤트가 올 때마다
불필요한 직렬화 비용이 발생하고, 번들 크기도 늘어남.

**조치**: `next.config.ts`에 `compiler.removeConsole` 옵션 추가. `NODE_ENV === "production"`일 때만
활성화하고 `console.error`는 예외로 남겨 에러 트래킹은 유지. 개발 모드에서는 기존처럼 로그가 그대로
보여 디버깅에 영향 없음.

**측정** (`next.config.ts`를 원본/수정본으로 번갈아 바꿔가며 `next build`를 두 번 실제로 실행, 캐시
영향을 없애기 위해 매번 `.next` 삭제 후 클린 빌드. Route JS Size 기준):

| 라우트 | 개선 전 | 개선 후 | 변화 |
|---|---|---|---|
| `/mainpage` | 70.8 kB | 66.7 kB | -5.8% |
| `/signup` | 49.6 kB | 48.8 kB | -1.6% |
| `/login` | 10.0 kB | 9.83 kB | -1.7% |

First Load JS 기준으로도 `/mainpage`가 219 kB → 215 kB로 감소.

스크린샷: `perf-screenshots/04-build-size-before-after.png` (실제 `next build` 실행 결과를
그대로 옮겨 터미널 형태로 정리한 캡쳐)

관련 파일: `next.config.ts`

---

## 3. 중복 컴포넌트 정리 (코드 품질)

같은 컴포넌트가 라우트 그룹별로 복사돼 3벌까지 존재하던 것을 하나로 통합. 번들 크기에는 큰 영향이
없었지만(이미 압축 단계에서 상당 부분 제거됨), 유지보수 관점에서 위험한 상태였고 실제로 그 중 하나는
잠재 버그를 갖고 있었음.

- **`DarkVeil.tsx`** (WebGL 배경 애니메이션, `ogl` 라이브러리 사용, 약 157줄)가 3곳에 존재:
  - `login/_component/DarkVeil.tsx` — 실제로는 어디서도 import되지 않는 **죽은 코드** → 삭제
  - `(landingpage)/_component/DarkVeil.tsx` — 공용 컴포넌트(`@/app/_component/DarkVeil`)와 100% 동일한
    사본 → import 경로를 공용 컴포넌트로 통일하고 사본 삭제
- **`TextType.tsx`** (타이핑 애니메이션, 약 195줄)도 동일한 패턴으로 2곳에 중복 존재:
  - 랜딩페이지 로컬 사본은 `useEffect` 의존성 배열에 `getRandomSpeed`가 빠져 있어 빌드 시
    `react-hooks/exhaustive-deps` 경고가 발생하던 상태(랜덤 타이핑 속도 옵션을 쓸 경우 stale
    closure로 이전 값을 참조하는 잠재 버그) → 공용 버전(수정된 버전)으로 통일하며 버그도 함께 제거

**→ 중복 코드 약 470줄 삭제, 잠재 버그 1건 제거**

관련 파일: `src/app/_component/DarkVeil.tsx`, `src/app/(landingpage)/_component/body.tsx`,
`src/app/_component/TextType.tsx`, `src/app/(landingpage)/_component/review.tsx`

---

## 캡쳐 자료

측정 과정/결과 스크린샷은 저장소에는 포함하지 않고 아래 로컬 경로에 저장했습니다 (포트폴리오 작성 시 참고):

```
C:\Users\fifa9\AppData\Local\Temp\claude\C--Projects-teaming\723443e8-0e24-4d85-b23c-5cee4411e15f\scratchpad\perf-screenshots\
  01-initial-state.png              — 벤치마크 페이지 초기 상태
  02-legacy-result.png              — 개선 전 시나리오 30회 리렌더 결과 (React.Profiler)
  03-modern-result.png              — 개선 후 시나리오 30회 리렌더 결과 (React.Profiler)
  04-build-size-before-after.png    — next build 실행 결과 전/후 비교
```

이 임시 폴더는 세션이 끝나면 정리될 수 있으니, 포트폴리오에 쓰실 거면 다른 곳으로 옮겨두시는 걸
추천드립니다.

---

## 요약 (이력서용 한 줄 정리 예시)

- 채팅방 메시지 리스트에 불필요한 리렌더링이 발생하는 것을 발견, `React.memo`와 참조 안정화
  (`useMemo` + `WeakMap` 캐시)로 리렌더 범위를 최소화해 React Profiler 기준 커밋당 렌더 시간을
  약 19~27ms → 0.36~0.76ms로 30~50배 단축
- 프로덕션 빌드에 남아있던 491건의 console 로그(특히 WebSocket 이벤트마다 실행되는 로그)를
  빌드 타임에 제거하도록 설정해 로그인 이후 라우트의 번들 크기를 최대 5.8% 절감
- 3벌로 중복돼 있던 컴포넌트(WebGL 배경, 타이핑 애니메이션)를 공용 컴포넌트로 통합해 약 470줄의
  중복/죽은 코드를 제거하고, 그 과정에서 발견한 `useEffect` 의존성 누락 버그를 함께 수정

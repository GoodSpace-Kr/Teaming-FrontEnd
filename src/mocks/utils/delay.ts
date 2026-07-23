import { delay as mswDelay } from "msw";

// 로딩 상태가 실제로 보이도록 약간의 지연을 준다.
export async function mockDelay(ms = 250): Promise<void> {
  await mswDelay(ms);
}

import { http, HttpResponse } from "msw";
import { path } from "./_shared";
import { mockDelay } from "../utils/delay";

export const landingHandlers = [
  http.get(path("/landing"), async () => {
    await mockDelay(150);
    return HttpResponse.json({
      totalUserCount: 1284,
      totalTeamCount: 312,
      completeTeamCount: 97,
    });
  }),
];

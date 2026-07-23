import { authHandlers } from "./auth";
import { usersHandlers } from "./users";
import { roomsHandlers } from "./rooms";
import { assignmentsHandlers } from "./assignments";
import { chatHandlers } from "./chat";
import { filesHandlers } from "./files";
import { paymentHandlers } from "./payment";
import { gifticonHandlers } from "./gifticon";
import { landingHandlers } from "./landing";

export const handlers = [
  ...authHandlers,
  ...usersHandlers,
  ...roomsHandlers,
  ...assignmentsHandlers,
  ...chatHandlers,
  ...filesHandlers,
  ...paymentHandlers,
  ...gifticonHandlers,
  ...landingHandlers,
];

import { post } from "./client";
import type { ApplyAnswer, ClientApplicationIn, VaApplicationIn } from "./models";

// Public: "Become a client" and "Apply as a VA" on the sign-in page.
export const applyAsClient = (body: ClientApplicationIn) => post<ApplyAnswer>("/public/apply/client", body);
export const applyAsVa = (body: VaApplicationIn) => post<ApplyAnswer>("/public/apply/va", body);

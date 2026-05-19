import { makeCrud } from "@/lib/crud";
import { accountBanks, insertAccountBankSchema } from "@shared/schema";

const crud = makeCrud({
  table: accountBanks,
  insertSchema: insertAccountBankSchema,
  requireAdminToWrite: true,
});
export const PATCH = crud.updateOne;
export const PUT = crud.updateOne;
export const DELETE = crud.deleteOne;

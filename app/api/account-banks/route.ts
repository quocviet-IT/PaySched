import { makeCrud } from "@/lib/crud";
import { accountBanks, insertAccountBankSchema } from "@shared/schema";

const crud = makeCrud({ table: accountBanks, insertSchema: insertAccountBankSchema });
export const GET = crud.listAll;
export const POST = crud.createOne;

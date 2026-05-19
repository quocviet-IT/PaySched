import { makeCrud } from "@/lib/crud";
import { internalCompanies, insertInternalCompanySchema } from "@shared/schema";

const crud = makeCrud({ table: internalCompanies, insertSchema: insertInternalCompanySchema });
export const GET = crud.listAll;
export const POST = crud.createOne;

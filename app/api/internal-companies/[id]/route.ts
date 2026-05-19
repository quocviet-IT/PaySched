import { makeCrud } from "@/lib/crud";
import { internalCompanies, insertInternalCompanySchema } from "@shared/schema";

const crud = makeCrud({
  table: internalCompanies,
  insertSchema: insertInternalCompanySchema,
  requireAdminToWrite: true,
});
export const PATCH = crud.updateOne;
export const DELETE = crud.deleteOne;

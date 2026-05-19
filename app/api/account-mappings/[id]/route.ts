import { makeCrud } from "@/lib/crud";
import { accountMappings, insertAccountMappingSchema } from "@shared/schema";

const crud = makeCrud({
  table: accountMappings,
  insertSchema: insertAccountMappingSchema,
  requireAdminToWrite: true,
});
export const PUT = crud.updateOne;
export const PATCH = crud.updateOne;
export const DELETE = crud.deleteOne;

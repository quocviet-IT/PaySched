import { makeCrud } from "@/lib/crud";
import { accountMappings, insertAccountMappingSchema } from "@shared/schema";

const crud = makeCrud({ table: accountMappings, insertSchema: insertAccountMappingSchema });
export const GET = crud.listAll;
export const POST = crud.createOne;

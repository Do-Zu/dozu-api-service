import db from '@/libs/drizzleClient.lib';
import { demoTable } from '@/models';

export const handleRepositoryDemo = async (param: any) => {
  // query the database or perform some operations
  // to get the data based on the param
  const data = await db.select().from(demoTable);

  console.log({ data });

  return data;
};

export const handleInsertDemo = async (param: any) => {
  console.log({ db });

  const data = await db
    .insert(demoTable)
    .values({ action: param?.action || 'undefined' })
    .returning();

  return data;
};

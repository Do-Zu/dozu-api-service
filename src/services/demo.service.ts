import { BadRequest, DatabaseError, NotFoundError } from '@/core/error';
import { handleRepositoryDemo } from '@/repositories/demo.repo';

export const handleServiceDemo = async (_param: any) => {
  if (!_param) {
    throw new BadRequest('param is required');
  }

  const data: any[] = await handleRepositoryDemo(_param);
  if (!data) {
    throw new DatabaseError('data not found');
  }

  if (data.length === 0) {
    throw new NotFoundError('Not found');
  }

  return {
    data,
    value: 1000,
    //... rest all data
  };
};

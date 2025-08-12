import validator from '@/core/validations/validator';
import { getUsersQuerySchema } from '@/dtos/admin/getUsers.dto';
import { updateUserRoleSchema } from '@/dtos/admin/updateUserRole.dto';

export const validateGetUsersQuery = () =>
  validator.validate({
    selector: 'query',
    schema: getUsersQuerySchema,
  });

export const validateUpdateUserRole = () =>
  validator.validate({
    selector: 'body',
    schema: updateUserRoleSchema,
  });

import validateData from '@/middleware/validations/validator';
import { getUsersQuerySchema } from '@/dtos/admin/getUsers.dto';
import { updateUserRoleSchema } from '@/dtos/admin/updateUserRole.dto';

export const validateGetUsersQuery = () =>
  validateData({
    selector: (req) => req.query,
    schema: getUsersQuerySchema,
  });

export const validateUpdateUserRole = () =>
  validateData({
    selector: req => req.body,
    schema: updateUserRoleSchema,
  });

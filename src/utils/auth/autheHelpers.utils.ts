export const sanitizeUserObject = (userData: any) => {
  const returnData = {
    userId: userData.user.userId,
    username: userData.user.username,
    email: userData.user.email,
    fullName: userData.user.fullName,
    avatarUrl: userData.user.avatarUrl,
 
  };
  return returnData;
};

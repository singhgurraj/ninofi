export const isAdminUser = (user) => {
  if (!user) return false;
  const role = (user.userRole || user.role || '').toUpperCase();
  return role === 'ADMIN';
};

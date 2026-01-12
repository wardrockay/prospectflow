export default defineEventHandler(async (event) => {
  // TODO: Implement logout with auth-core session service
  // For now, just return success
  return {
    message: 'Logged out successfully',
    success: true,
  };
});

export default {
  userValidate(event) {
    const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!allowedEmail || event.user.email?.toLowerCase() !== allowedEmail) event.deny();
  }
};

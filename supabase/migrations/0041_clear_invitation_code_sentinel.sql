-- The baseline seed used the placeholder CONFIGURE_IN_ADMIN as the default invitation code
-- so the real code stays out of source control. 0003 copied that placeholder into
-- campaign_access, where it looked like a configured code. Clear it so a fresh database
-- stays blocked until an administrator supplies the real code. Real codes are untouched.
update campaign_access set invitation_code=null where invitation_code='CONFIGURE_IN_ADMIN';
